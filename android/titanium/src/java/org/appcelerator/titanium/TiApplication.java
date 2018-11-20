/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2015 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package org.appcelerator.titanium;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Application;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Looper;
import android.support.multidex.MultiDex;
import android.util.DisplayMetrics;
import android.view.accessibility.AccessibilityManager;
import com.appcelerator.aps.APSAnalytics;
import com.appcelerator.aps.APSAnalyticsMeta;

import org.appcelerator.kroll.KrollApplication;
import org.appcelerator.kroll.KrollModule;
import org.appcelerator.kroll.KrollProxy;
import org.appcelerator.kroll.KrollRuntime;
import org.appcelerator.kroll.KrollDict;
import org.appcelerator.kroll.common.CurrentActivityListener;
import org.appcelerator.kroll.common.Log;
import org.appcelerator.kroll.common.TiConfig;
import org.appcelerator.kroll.common.TiDeployData;
import org.appcelerator.kroll.common.TiMessenger;
import org.appcelerator.kroll.util.KrollAssetHelper;
import org.appcelerator.kroll.util.TiTempFileHelper;
import org.appcelerator.titanium.util.TiBlobLruCache;
import org.appcelerator.titanium.util.TiFileHelper;
import org.appcelerator.titanium.util.TiImageLruCache;
import org.appcelerator.titanium.util.TiResponseCache;
import org.appcelerator.titanium.util.TiUIHelper;
import org.appcelerator.titanium.util.TiWeakList;
import org.json.JSONException;
import org.json.JSONObject;
import ti.modules.titanium.TitaniumModule;

import java.io.File;
import java.io.InputStream;
import java.lang.Thread.UncaughtExceptionHandler;
import java.lang.ref.SoftReference;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Properties;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The main application entry point for all Titanium applications and services.
 */
public abstract class TiApplication extends Application implements KrollApplication
{
	private static final String SYSTEM_UNIT = "system";
	private static final String TAG = "TiApplication";
	private static final String PROPERTY_THREAD_STACK_SIZE = "ti.android.threadstacksize";
	private static final String PROPERTY_COMPILE_JS = "ti.android.compilejs";
	private static final String PROPERTY_ENABLE_COVERAGE = "ti.android.enablecoverage";
	private static final String PROPERTY_DEFAULT_UNIT = "ti.ui.defaultunit";
	private static final String PROPERTY_USE_LEGACY_WINDOW = "ti.android.useLegacyWindow";
	private static long mainThreadId = 0;

	protected static TiApplication tiApp = null;

	public static final String DEPLOY_TYPE_DEVELOPMENT = "development";
	public static final String DEPLOY_TYPE_TEST = "test";
	public static final String DEPLOY_TYPE_PRODUCTION = "production";
	public static final int DEFAULT_THREAD_STACK_SIZE = 16 * 1024; // 16K as a "sane" default
	public static final String APPLICATION_PREFERENCES_NAME = "titanium";
	public static final String PROPERTY_FASTDEV = "ti.android.fastdev";
	public static final int TRIM_MEMORY_RUNNING_LOW = 10; // Application.TRIM_MEMORY_RUNNING_LOW for API 16+

	// Whether or not using legacy window. This is set in the application's tiapp.xml with the
	// "ti.android.useLegacyWindow" property.
	public static boolean USE_LEGACY_WINDOW = false;

	private boolean restartPending = false;
	private String baseUrl;
	private String startUrl;
	private HashMap<String, SoftReference<KrollProxy>> proxyMap;
	private TiWeakList<KrollProxy> appEventProxies = new TiWeakList<KrollProxy>();
	private WeakReference<TiRootActivity> rootActivity;
	private TiProperties appProperties;
	private WeakReference<Activity> currentActivity;
	private String density;
	private String buildVersion = "", buildTimestamp = "", buildHash = "";
	private String defaultUnit;
	private TiResponseCache responseCache;
	private BroadcastReceiver localeReceiver;
	private BroadcastReceiver externalStorageReceiver;
	private AccessibilityManager accessibilityManager = null;
	private boolean forceFinishRootActivity = false;

	protected TiDeployData deployData;
	protected TiTempFileHelper tempFileHelper;
	protected ITiAppInfo appInfo;
	protected TiStylesheet stylesheet;
	protected HashMap<String, WeakReference<KrollModule>> modules;
	protected String[] filteredAnalyticsEvents;

	public static AtomicBoolean isActivityTransition = new AtomicBoolean(false);
	protected static ArrayList<ActivityTransitionListener> activityTransitionListeners =
		new ArrayList<ActivityTransitionListener>();
	protected static TiWeakList<Activity> activityStack = new TiWeakList<Activity>();

	public static interface ActivityTransitionListener {
		public void onActivityTransition(boolean state);
	}

	public static void addActivityTransitionListener(ActivityTransitionListener a)
	{
		activityTransitionListeners.add(a);
	}

	public static void removeActivityTransitionListener(ActivityTransitionListener a)
	{
		activityTransitionListeners.remove(a);
	}

	public static void updateActivityTransitionState(boolean state)
	{
		isActivityTransition.set(state);
		for (int i = 0; i < activityTransitionListeners.size(); ++i) {
			activityTransitionListeners.get(i).onActivityTransition(state);
		}
	}
	public CountDownLatch rootActivityLatch = new CountDownLatch(1);

	public TiApplication()
	{
		Log.checkpoint(TAG, "checkpoint, app created.");

		// Keep a reference to this application object. Accessible via static getInstance() method.
		tiApp = this;

		loadBuildProperties();

		mainThreadId = Looper.getMainLooper().getThread().getId();

		modules = new HashMap<String, WeakReference<KrollModule>>();
		TiMessenger.getMessenger(); // initialize message queue for main thread
	}

	/**
	 * Retrieves the instance of TiApplication. There is one instance per Android application.
	 * @return the instance of TiApplication.
	 * @module.api
	 */
	public static TiApplication getInstance()
	{
		return tiApp;
	}

	public static void addToActivityStack(Activity activity)
	{
		activityStack.add(new WeakReference<Activity>(activity));
	}

	public static void removeFromActivityStack(Activity activity)
	{
		activityStack.remove(activity);
	}

	// Calls finish on the list of activities in the stack. This should only be called when we want to terminate the
	// application (typically when the root activity is destroyed)
	public static void terminateActivityStack()
	{
		if (activityStack == null || activityStack.size() == 0) {
			return;
		}

		WeakReference<Activity> activityRef;
		Activity currentActivity;

		for (int i = activityStack.size() - 1; i > 0; i--) {
			// We need to check the stack size here again. Since we call finish(), that could potentially
			// change the activity stack while we are looping through them. TIMOB-12487
			if (i < activityStack.size()) {
				activityRef = activityStack.get(i);
				if (activityRef != null) {
					currentActivity = activityRef.get();
					if (currentActivity != null && !currentActivity.isFinishing()) {
						currentActivity.finish();
						activityStack.remove(activityRef);
					}
				}
			}
		}
	}

	public boolean activityStackHasLaunchActivity()
	{
		if (activityStack == null || activityStack.size() == 0) {
			return false;
		}
		for (WeakReference<Activity> activityRef : activityStack) {
			if (activityRef != null && activityRef.get() instanceof TiLaunchActivity) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check whether the current activity is in foreground or not.
	 * @return true if the current activity is in foreground; false otherwise.
	 * @module.api
	 */
	public static boolean isCurrentActivityInForeground()
	{
		Activity currentActivity = getAppCurrentActivity();
		if (currentActivity instanceof TiBaseActivity) {
			return ((TiBaseActivity) currentActivity).isInForeground();
		}
		return false;
	}

	/**
	 * This is a convenience method to avoid having to check TiApplication.getInstance() is not null every
	 * time we need to grab the current activity.
	 * @return the current activity
	 * @module.api
	 */
	public static Activity getAppCurrentActivity()
	{
		return tiApp.getCurrentActivity();
	}

	/**
	 * This is a convenience method to avoid having to check TiApplication.getInstance() is not null every
	 * time we need to grab the root or current activity.
	 * @return root activity if exists. If root activity doesn't exist, returns current activity if exists. Otherwise returns null.
	 * @module.api
	 */
	public static Activity getAppRootOrCurrentActivity()
	{
		return tiApp.getRootOrCurrentActivity();
	}

	/**
	 * @return the current activity if exists. Otherwise, the thread will wait for a valid activity to be visible.
	 * @module.api
	 */
	public Activity getCurrentActivity()
	{
		int activityStackSize;

		while ((activityStackSize = activityStack.size()) > 0) {
			Activity activity = (activityStack.get(activityStackSize - 1)).get();

			// Skip and remove any activities which are dead or in the process of finishing.
			if (activity == null || activity.isFinishing()) {
				activityStack.remove(activityStackSize - 1);
				continue;
			}

			return activity;
		}

		Log.d(TAG, "activity stack is empty, unable to get current activity", Log.DEBUG_MODE);
		return null;
	}

	/**
	 * @return root activity if exists. If root activity doesn't exist, returns current activity if exists. Otherwise returns null.
	 */
	public Activity getRootOrCurrentActivity()
	{
		Activity activity;
		if (rootActivity != null) {
			activity = rootActivity.get();
			if (activity != null) {
				return activity;
			}
		}

		if (currentActivity != null) {
			activity = currentActivity.get();
			if (activity != null) {
				return activity;
			}
		}

		return null;
	}

	protected void loadBuildProperties()
	{
		// Initialize build property member variables.
		this.buildVersion = "1.0";
		this.buildTimestamp = "N/A";
		this.buildHash = "N/A";

		// Attempt to read the "build.properties" file.
		final String FILE_NAME = "org/appcelerator/titanium/build.properties";
		try (InputStream stream = getClass().getClassLoader().getResourceAsStream(FILE_NAME)) {
			if (stream != null) {
				Properties properties = new Properties();
				properties.load(stream);
				this.buildVersion = properties.getProperty("build.version", this.buildVersion);
				this.buildTimestamp = properties.getProperty("build.timestamp", this.buildTimestamp);
				this.buildHash = properties.getProperty("build.githash", this.buildHash);
			}
		} catch (Exception e) {
		}
	}

	public void loadAppProperties()
	{
		// Load the JSON file:
		String appPropertiesString = KrollAssetHelper.readAsset("Resources/_app_props_.json");
		if (appPropertiesString != null) {
			try {
				TiProperties.setSystemProperties(new JSONObject(appPropertiesString));
			} catch (JSONException e) {
				Log.e(TAG, "Unable to load app properties.");
			}
		}
	}

	@Override
	protected void attachBaseContext(Context base)
	{
		super.attachBaseContext(base);
		MultiDex.install(this);
	}

	@Override
	public void onCreate()
	{
		super.onCreate();
		Log.d(TAG, "Application onCreate", Log.DEBUG_MODE);

		// handle uncaught java exceptions
		Thread.setDefaultUncaughtExceptionHandler(new UncaughtExceptionHandler() {
			@Override
			public void uncaughtException(Thread t, Throwable e)
			{

				// obtain java stack trace
				String javaStack = null;
				StackTraceElement[] frames = e.getCause() != null ? e.getCause().getStackTrace() : e.getStackTrace();
				if (frames != null && frames.length > 0) {
					javaStack = "";
					for (StackTraceElement frame : frames) {
						javaStack += "\n    " + frame.toString();
					}
				}

				// throw exception as KrollException
				KrollRuntime.dispatchException("Runtime Error", e.getMessage(), null, 0, null, 0, null, javaStack);
			}
		});

		appProperties = new TiProperties(getApplicationContext(), APPLICATION_PREFERENCES_NAME, false);

		File fullPath = new File(TiC.URL_ANDROID_ASSET_RESOURCES, "app.js");
		baseUrl = fullPath.getParent();

		proxyMap = new HashMap<String, SoftReference<KrollProxy>>(5);

		tempFileHelper = new TiTempFileHelper(this);

		deployData = new TiDeployData(this);

		registerActivityLifecycleCallbacks(new TiApplicationLifecycle());
	}

	@Override
	public void onTerminate()
	{
		stopLocaleMonitor();
		stopExternalStorageMonitor();
		accessibilityManager = null;
		super.onTerminate();
	}

	@Override
	public void onLowMemory()
	{
		// Release all the cached images
		TiBlobLruCache.getInstance().evictAll();
		TiImageLruCache.getInstance().evictAll();
		super.onLowMemory();
	}

	@SuppressLint("NewApi")
	@Override
	public void onTrimMemory(int level)
	{
		if (Build.VERSION.SDK_INT >= TiC.API_LEVEL_HONEYCOMB && level >= TRIM_MEMORY_RUNNING_LOW) {
			// Release all the cached images
			TiBlobLruCache.getInstance().evictAll();
			TiImageLruCache.getInstance().evictAll();
		}
		super.onTrimMemory(level);
	}

	public void postAppInfo()
	{
		deployData = new TiDeployData(this);

		String deployType = this.appProperties.getString("ti.deploytype", "unknown");
		if ("unknown".equals(deployType)) {
			deployType = this.appInfo.getDeployType();
		}

		String buildType = this.appInfo.getBuildType();
		if (buildType != null && !buildType.equals("")) {
			APSAnalyticsMeta.setBuildType(buildType);
		}

		APSAnalyticsMeta.setAppId(this.appInfo.getId());
		APSAnalyticsMeta.setAppName(this.appInfo.getName());
		APSAnalyticsMeta.setAppVersion(this.appInfo.getVersion());
		APSAnalyticsMeta.setDeployType(deployType);
		APSAnalyticsMeta.setSdkVersion("ti." + getTiBuildVersion());
		APSAnalytics.getInstance().setMachineId(this);

		if (isAnalyticsEnabled()) {
			APSAnalytics.getInstance().initialize(getAppGUID(), this);
		} else {
			Log.i(TAG, "Analytics have been disabled");
		}
	}

	public void postOnCreate()
	{
		KrollRuntime runtime = KrollRuntime.getInstance();
		if (runtime != null) {
			Log.i(TAG, "Titanium Javascript runtime: " + runtime.getRuntimeName());
		} else {
			// This ought not to be possible.
			Log.w(TAG, "Titanium Javascript runtime: unknown");
		}

		TiConfig.DEBUG = TiConfig.LOGD = appProperties.getBool("ti.android.debug", false);
		USE_LEGACY_WINDOW = appProperties.getBool(PROPERTY_USE_LEGACY_WINDOW, false);

		startLocaleMonitor();
		startExternalStorageMonitor();

		// Register the default cache handler
		responseCache = new TiResponseCache(getRemoteCacheDir(), this);
		TiResponseCache.setDefault(responseCache);
		KrollRuntime.setPrimaryExceptionHandler(new TiExceptionHandler());
	}

	private File getRemoteCacheDir()
	{
		File cacheDir = new File(tempFileHelper.getTempDirectory(), "remote-cache");
		if (!cacheDir.exists()) {
			cacheDir.mkdirs();
			tempFileHelper.excludeFileOnCleanup(cacheDir);
		}
		return cacheDir.getAbsoluteFile();
	}

	public void setRootActivity(TiRootActivity rootActivity)
	{
		this.rootActivity = new WeakReference<TiRootActivity>(rootActivity);
		rootActivityLatch.countDown();

		// calculate the display density
		DisplayMetrics dm = new DisplayMetrics();
		rootActivity.getWindowManager().getDefaultDisplay().getMetrics(dm);
		switch (dm.densityDpi) {
			case DisplayMetrics.DENSITY_HIGH: {
				density = "high";
				break;
			}
			case DisplayMetrics.DENSITY_MEDIUM: {
				density = "medium";
				break;
			}
			case DisplayMetrics.DENSITY_LOW: {
				density = "low";
				break;
			}
		}

		tempFileHelper.scheduleCleanTempDir();
	}

	/**
	 * @return the app's root activity if exists, null otherwise.
	 */
	public TiRootActivity getRootActivity()
	{
		if (rootActivity == null) {
			return null;
		}

		return rootActivity.get();
	}

	/**
	 * @return whether the root activity is available
	 */
	public boolean isRootActivityAvailable()
	{
		if (rootActivity != null) {
			Activity activity = rootActivity.get();
			if (activity != null) {
				return !activity.isFinishing();
			}
		}

		return false;
	}

	public void setCurrentActivity(Activity callingActivity, Activity newValue)
	{
		synchronized (this)
		{
			Activity currentActivity = getCurrentActivity();
			if (currentActivity == null || callingActivity == currentActivity) {
				this.currentActivity = new WeakReference<Activity>(newValue);
			}
		}
	}

	public String getBaseUrl()
	{
		return baseUrl;
	}

	public String getStartUrl()
	{
		return startUrl;
	}

	public void addAppEventProxy(KrollProxy appEventProxy)
	{
		if (appEventProxy != null && !appEventProxies.contains(appEventProxy)) {
			appEventProxies.add(new WeakReference<KrollProxy>(appEventProxy));
		}
	}

	public void removeAppEventProxy(KrollProxy appEventProxy)
	{
		appEventProxies.remove(appEventProxy);
	}

	public boolean fireAppEvent(String eventName, KrollDict data)
	{
		boolean handled = false;
		for (WeakReference<KrollProxy> weakProxy : appEventProxies) {
			KrollProxy appEventProxy = weakProxy.get();
			if (appEventProxy == null) {
				continue;
			}

			boolean proxyHandled = appEventProxy.fireEvent(eventName, data);
			handled = handled || proxyHandled;
		}

		return handled;
	}

	/**
	 * @return the app's properties, which are listed in tiapp.xml.
	 * App properties can also be set at runtime by the application in Javascript.
	 * @module.api
	 */
	public TiProperties getAppProperties()
	{
		return appProperties;
	}

	public ITiAppInfo getAppInfo()
	{
		return appInfo;
	}

	/**
	 * @return the app's GUID. Each application has a unique GUID.
	 */
	public String getAppGUID()
	{
		return getAppInfo().getGUID();
	}

	public KrollDict getStylesheet(String basename, Collection<String> classes, String objectId)
	{
		if (stylesheet != null) {
			return stylesheet.getStylesheet(objectId, classes, density, basename);
		}
		return null;
	}

	public void registerProxy(KrollProxy proxy)
	{
		String proxyId = proxy.getProxyId();
		if (!proxyMap.containsKey(proxyId)) {
			proxyMap.put(proxyId, new SoftReference<KrollProxy>(proxy));
		}
	}

	public KrollProxy unregisterProxy(String proxyId)
	{
		KrollProxy proxy = null;

		SoftReference<KrollProxy> ref = proxyMap.remove(proxyId);
		if (ref != null) {
			proxy = ref.get();
		}

		return proxy;
	}

	public boolean isAnalyticsEnabled()
	{
		return getAppInfo().isAnalyticsEnabled();
	}

	public boolean runOnMainThread()
	{
		return getAppProperties().getBool("run-on-main-thread", DEFAULT_RUN_ON_MAIN_THREAD);
	}

	public boolean intentFilterNewTask()
	{
		return getAppProperties().getBool("intent-filter-new-task", false);
	}

	public void setFilterAnalyticsEvents(String[] events)
	{
		filteredAnalyticsEvents = events;
	}

	public boolean isAnalyticsFiltered(String eventName)
	{
		if (filteredAnalyticsEvents == null) {
			return false;
		}

		for (int i = 0; i < filteredAnalyticsEvents.length; ++i) {
			String currentName = filteredAnalyticsEvents[i];
			if (eventName.equals(currentName)) {
				return true;
			}
		}
		return false;
	}

	public String getDeployType()
	{
		return getAppInfo().getDeployType();
	}

	/**
	 * @return the build version, which is built in as part of the SDK.
	 */
	public String getTiBuildVersion()
	{
		return buildVersion;
	}

	public String getSDKVersion()
	{
		return getTiBuildVersion();
	}

	public String getTiBuildTimestamp()
	{
		return buildTimestamp;
	}

	public String getTiBuildHash()
	{
		return buildHash;
	}

	public String getDefaultUnit()
	{
		if (defaultUnit == null) {
			defaultUnit = getAppProperties().getString(PROPERTY_DEFAULT_UNIT, SYSTEM_UNIT);
			// Check to make sure default unit is valid, otherwise use system
			Pattern unitPattern = Pattern.compile("system|px|dp|dip|mm|cm|in");
			Matcher m = unitPattern.matcher(defaultUnit);
			if (!m.matches()) {
				defaultUnit = SYSTEM_UNIT;
			}
		}
		return defaultUnit;
	}

	public int getThreadStackSize()
	{
		return getAppProperties().getInt(PROPERTY_THREAD_STACK_SIZE, DEFAULT_THREAD_STACK_SIZE);
	}

	public boolean forceCompileJS()
	{
		return getAppProperties().getBool(PROPERTY_COMPILE_JS, false);
	}

	public TiDeployData getDeployData()
	{
		return deployData;
	}

	public boolean isFastDevMode()
	{
		/* Fast dev is enabled by default in development mode, and disabled otherwise
		 * When the property is set, it overrides the default behavior on emulator only
		 * Deploy types are as follow:
		 *    Emulator: 'development'
		 *    Device: 'test'
		 */
		boolean development = getDeployType().equals(TiApplication.DEPLOY_TYPE_DEVELOPMENT);
		if (!development) {
			return false;
		}
		return getAppProperties().getBool(TiApplication.PROPERTY_FASTDEV, development);
	}

	public boolean isCoverageEnabled()
	{
		if (!getDeployType().equals(TiApplication.DEPLOY_TYPE_PRODUCTION)) {
			return getAppProperties().getBool(TiApplication.PROPERTY_ENABLE_COVERAGE, false);
		}
		return false;
	}

	public void scheduleRestart(int delay)
	{
		Log.w(TAG, "Scheduling application restart");
		if (Log.isDebugModeEnabled()) {
			Log.d(TAG,
				  "Here is call stack leading to restart. (NOTE: this is not a real exception, just a stack trace.) :");
			(new Exception()).printStackTrace();
		}
		this.restartPending = true;
		TiRootActivity rootActivity = getRootActivity();
		if (rootActivity != null) {
			rootActivity.restartActivity(delay);
		}
	}

	public void softRestart()
	{
		KrollRuntime runtime = KrollRuntime.getInstance();

		// prevent termination of root activity via TiBaseActivity.shouldFinishRootActivity()
		TiBaseActivity.canFinishRoot = false;

		// terminate all activities excluding root
		TiApplication.terminateActivityStack();

		// allow termination again
		TiBaseActivity.canFinishRoot = true;

		// restart kroll runtime
		runtime.doDispose();
		runtime.initRuntime();

		// manually re-launch app
		runtime.doRunModule(KrollAssetHelper.readAsset(TiC.PATH_APP_JS), TiC.URL_APP_JS,
							((TiBaseActivity) getRootOrCurrentActivity()).getActivityProxy());
	}

	public boolean isRestartPending()
	{
		return restartPending;
	}

	public TiTempFileHelper getTempFileHelper()
	{
		return tempFileHelper;
	}

	/**
	 * @return true if the current thread is the main thread, false otherwise.
	 * @module.api
	 */
	public static boolean isUIThread()
	{
		if (mainThreadId == Thread.currentThread().getId()) {
			return true;
		}

		return false;
	}

	public KrollModule getModuleByName(String name)
	{
		WeakReference<KrollModule> module = modules.get(name);
		if (module == null) {
			return null;
		}

		return module.get();
	}

	public void registerModuleInstance(String name, KrollModule module)
	{
		if (modules.containsKey(name)) {
			Log.w(TAG, "Registering module with name already in use.");
		}

		modules.put(name, new WeakReference<KrollModule>(module));
	}

	public void waitForCurrentActivity(CurrentActivityListener l)
	{
		TiUIHelper.waitForCurrentActivity(l);
	}

	public boolean isDebuggerEnabled()
	{
		return getDeployData().isDebuggerEnabled();
	}

	private void startLocaleMonitor()
	{
		localeReceiver = new BroadcastReceiver() {
			@Override
			public void onReceive(Context context, Intent intent)
			{
				final KrollModule locale = getModuleByName("Locale");
				if (!locale.hasListeners(TiC.EVENT_CHANGE)) {
					TiApplication.getInstance().softRestart();
				} else {
					locale.fireEvent(TiC.EVENT_CHANGE, null);
				}
			}
		};

		registerReceiver(localeReceiver, new IntentFilter(Intent.ACTION_LOCALE_CHANGED));
	}

	private void stopLocaleMonitor()
	{
		unregisterReceiver(localeReceiver);
	}

	private void startExternalStorageMonitor()
	{
		externalStorageReceiver = new BroadcastReceiver() {
			@Override
			public void onReceive(Context context, Intent intent)
			{
				if (Intent.ACTION_MEDIA_MOUNTED.equals(intent.getAction())) {
					responseCache.setCacheDir(getRemoteCacheDir());
					TiResponseCache.setDefault(responseCache);
					Log.i(TAG, "SD card has been mounted. Enabling cache for http responses.", Log.DEBUG_MODE);

				} else {
					// if the sd card is removed, we don't cache http responses
					TiResponseCache.setDefault(null);
					Log.i(TAG, "SD card has been unmounted. Disabling cache for http responses.", Log.DEBUG_MODE);
				}
			}
		};

		IntentFilter filter = new IntentFilter();

		filter.addAction(Intent.ACTION_MEDIA_MOUNTED);
		filter.addAction(Intent.ACTION_MEDIA_REMOVED);
		filter.addAction(Intent.ACTION_MEDIA_UNMOUNTED);
		filter.addAction(Intent.ACTION_MEDIA_BAD_REMOVAL);
		filter.addDataScheme("file");

		registerReceiver(externalStorageReceiver, filter);
	}

	private void stopExternalStorageMonitor()
	{
		unregisterReceiver(externalStorageReceiver);
	}

	public void dispose()
	{
		TiActivityWindows.dispose();
		TiActivitySupportHelpers.dispose();
		TiFileHelper.getInstance().destroyTempFiles();
	}

	public void cancelTimers()
	{
		TitaniumModule.cancelTimers();
	}

	/**
	 * Our forced restarts (for conditions such as android bug 2373, TIMOB-1911 and TIMOB-7293)
	 * don't create new processes or pass through TiApplication() (the ctor). We need to reset
	 * some state to better mimic a complete application restart.
	 */
	public void beforeForcedRestart()
	{
		restartPending = false;
		currentActivity = null;
		TiApplication.isActivityTransition.set(false);
		if (TiApplication.activityTransitionListeners != null) {
			TiApplication.activityTransitionListeners.clear();
		}
		if (TiApplication.activityStack != null) {
			TiApplication.activityStack.clear();
		}
	}

	public AccessibilityManager getAccessibilityManager()
	{
		if (accessibilityManager == null) {
			accessibilityManager = (AccessibilityManager) getSystemService(Context.ACCESSIBILITY_SERVICE);
		}
		return accessibilityManager;
	}

	public void setForceFinishRootActivity(boolean forced)
	{
		forceFinishRootActivity = forced;
	}

	public boolean getForceFinishRootActivity()
	{
		return forceFinishRootActivity;
	}

	public abstract void verifyCustomModules(TiRootActivity rootActivity);
}
