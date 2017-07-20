/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2016 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.ui;

import java.lang.ref.WeakReference;
import java.util.ArrayList;

import org.appcelerator.kroll.KrollDict;
import org.appcelerator.kroll.annotations.Kroll;
import org.appcelerator.kroll.common.AsyncResult;
import org.appcelerator.kroll.common.Log;
import org.appcelerator.kroll.common.TiMessenger;
import org.appcelerator.titanium.TiActivity;
import org.appcelerator.titanium.TiActivityWindow;
import org.appcelerator.titanium.TiActivityWindows;
import org.appcelerator.titanium.TiApplication;
import org.appcelerator.titanium.TiBaseActivity;
import org.appcelerator.titanium.TiBlob;
import org.appcelerator.titanium.TiC;
import org.appcelerator.titanium.proxy.TiWindowProxy;
import org.appcelerator.titanium.util.TiConvert;
import org.appcelerator.titanium.util.TiUIHelper;

import ti.modules.titanium.ui.widget.tabgroup.TiUIAbstractTabGroup;
import ti.modules.titanium.ui.widget.tabgroup.TiUIActionBarTabGroup;
import android.app.Activity;
import android.content.Intent;
import android.os.Message;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.WindowManager;

@Kroll.proxy(creatableInModule=UIModule.class, propertyAccessors={
	TiC.PROPERTY_TABS_BACKGROUND_COLOR,
	TiC.PROPERTY_ACTIVE_TAB_BACKGROUND_COLOR,
	TiC.PROPERTY_SWIPEABLE,
	TiC.PROPERTY_EXIT_ON_CLOSE,
	TiC.PROPERTY_SMOOTH_SCROLL_ON_TAB_CLICK
})
public class TabGroupProxy extends TiWindowProxy implements TiActivityWindow
{
	private static final String TAG = "TabGroupProxy";
	private static final String PROPERTY_POST_TAB_GROUP_CREATED = "postTabGroupCreated";
	private static final int MSG_FIRST_ID = TiWindowProxy.MSG_LAST_ID + 1;

	private static final int MSG_ADD_TAB = MSG_FIRST_ID + 100;
	private static final int MSG_REMOVE_TAB = MSG_FIRST_ID + 101;
	private static final int MSG_SET_ACTIVE_TAB = MSG_FIRST_ID + 102;
	private static final int MSG_GET_ACTIVE_TAB = MSG_FIRST_ID + 103;
	private static final int MSG_SET_TABS = MSG_FIRST_ID + 104;
	private static final int MSG_DISABLE_TAB_NAVIGATION = MSG_FIRST_ID + 105;

	protected static final int MSG_LAST_ID = MSG_FIRST_ID + 999;

	private ArrayList<TabProxy> tabs = new ArrayList<TabProxy>();
	private WeakReference<AppCompatActivity> tabGroupActivity;
	private TabProxy selectedTab;
	private boolean isFocused;

	public TabGroupProxy()
	{
		super();
		defaultValues.put(TiC.PROPERTY_SWIPEABLE, true);
		defaultValues.put(TiC.PROPERTY_SMOOTH_SCROLL_ON_TAB_CLICK, true);
	}

	@Override
	public boolean handleMessage(Message msg)
	{
		switch (msg.what) {
			case MSG_ADD_TAB: {
				AsyncResult result = (AsyncResult) msg.obj;
				handleAddTab((TabProxy) result.getArg());
				result.setResult(null);
				return true;
			}
			case MSG_REMOVE_TAB: {
				AsyncResult result = (AsyncResult) msg.obj;
				handleRemoveTab((TabProxy) result.getArg());
				result.setResult(null);
				return true;
			}
			case MSG_SET_ACTIVE_TAB: {
				AsyncResult result = (AsyncResult) msg.obj;
				handleSetActiveTab((TabProxy) result.getArg());
				result.setResult(null);
				return true;
			}
			case MSG_GET_ACTIVE_TAB: {
				AsyncResult result = (AsyncResult) msg.obj;
				result.setResult(handleGetActiveTab());
				return true;
			}
			case MSG_SET_TABS: {
				AsyncResult result = (AsyncResult) msg.obj;
				handleSetTabs(result.getArg());
				result.setResult(null);
				return true;
			}
			case MSG_DISABLE_TAB_NAVIGATION: {
				AsyncResult result = (AsyncResult) msg.obj;
				handleDisableTabNavigation(TiConvert.toBoolean(result.getArg()));
				result.setResult(null);
				return true;
			}
			default : {
				return super.handleMessage(msg);
			}
		}
	}

	public TabProxy[] getTabs()
	{
		TabProxy[] tps = null;

		if (tabs != null) {
			tps = tabs.toArray(new TabProxy[tabs.size()]);
		}

		return tps;
	}

	public int getTabIndex(TabProxy tabProxy)
	{
		return tabs.indexOf(tabProxy);
	}

	public ArrayList<TabProxy> getTabList()
	{
		return tabs;
	}

	@Kroll.method
	public void disableTabNavigation(boolean disable)
        {
                if (TiApplication.isUIThread()) {
                        handleDisableTabNavigation(disable);

                        return;
                }

                TiMessenger.sendBlockingMainMessage(getMainHandler().obtainMessage(MSG_DISABLE_TAB_NAVIGATION), disable);
        }

	private void handleDisableTabNavigation(boolean disable)
	{
		TiUIActionBarTabGroup tabGroup = (TiUIActionBarTabGroup) view;
		if (tabGroup != null) {
			tabGroup.disableTabNavigation(disable);
		}
	}

	@Kroll.method
	public void addTab(TabProxy tab)
	{
		if (tab == null) {
			return;
		}

		if (TiApplication.isUIThread()) {
			handleAddTab(tab);
			return;
		}

		TiMessenger.sendBlockingMainMessage(getMainHandler().obtainMessage(MSG_ADD_TAB), tab);
	}

	private void handleAddTab(TabProxy tab)
	{
		if (tab == null) {
			return;
		}

		// Set the tab's parent to this tab group.
		// This allows for certain events to bubble up.
		tab.setTabGroup(this);

		tabs.add(tab);

		TiUIAbstractTabGroup tabGroup = (TiUIAbstractTabGroup) view;
		if (tabGroup != null) {
			tabGroup.addTab(tab);
		}
	}

	@Kroll.method
	public void removeTab(TabProxy tab) {
		if (TiApplication.isUIThread()) {
			handleRemoveTab(tab);

		} else {
			TiMessenger.sendBlockingMainMessage(getMainHandler().obtainMessage(MSG_REMOVE_TAB), tab);
		}

		tab.setParent(null);
	}

	public void handleRemoveTab(TabProxy tab) {
		TiUIAbstractTabGroup tabGroup = (TiUIAbstractTabGroup) view;
		if (tabGroup != null) {
			tabGroup.removeTab(tab);
		}

		tabs.remove(tab);
	}

	@Kroll.method
	public void setActiveTab(Object tabOrIndex)
	{
		TabProxy tab = parseTab(tabOrIndex);

		if(tab == null) {
			return;
		}

		if (TiApplication.isUIThread()) {
			handleSetActiveTab(tab);

		} else {
			TiMessenger.sendBlockingMainMessage(getMainHandler().obtainMessage(MSG_SET_ACTIVE_TAB), tab);
		}
	}

	protected void handleSetActiveTab(TabProxy tab)
	{
		TiUIAbstractTabGroup tabGroup = (TiUIAbstractTabGroup) view;
		if (tabGroup != null) {
			// Change the selected tab of the group.
			// Once the change is completed onTabSelected() will be
			// called to fire events and update the active tab.
			tabGroup.selectTab(tab);

		} else {
			// Mark this tab to be selected when the tab group opens.
			selectedTab = tab;
		}
	}

	@Kroll.method
	public void setTabs(Object obj)
	{
		if (TiApplication.isUIThread()) {
			handleSetTabs(obj);
			return;
		}

		TiMessenger.sendBlockingMainMessage(getMainHandler().obtainMessage(MSG_SET_TABS), obj);
	}


	private TabProxy parseTab(Object tabOrIndex) {
		TabProxy tab = null;
		if (tabOrIndex instanceof Number) {
			int tabIndex = ((Number) tabOrIndex).intValue();
			if (tabIndex < 0 || tabIndex >= tabs.size()) {
				Log.e(TAG, "Invalid tab index.");
			} else {
				tab = tabs.get(tabIndex);
			}

		} else if (tabOrIndex instanceof TabProxy) {
			if (!tabs.contains((TabProxy) tabOrIndex)) {
				Log.e(TAG, "Cannot activate tab not in this group.");
			} else {
				tab = (TabProxy) tabOrIndex;
			}
		} else {
			Log.e(TAG, "No valid tab provided when setting active tab.");
		}
		return tab;
	}

	private void handleSetTabs(Object obj)
	{
		tabs.clear();
		if (obj instanceof Object[]) {
			Object[] objArray = (Object[]) obj;
			for (Object tabProxy : objArray) {
				if (tabProxy instanceof TabProxy) {
					handleAddTab((TabProxy) tabProxy);
				}
			}
		}
	}

	@Override
	public void handleCreationDict(KrollDict options) {
		super.handleCreationDict(options);

		// Support setting orientation modes at creation.
		Object orientationModes = options.get(TiC.PROPERTY_ORIENTATION_MODES);
		if (orientationModes != null && orientationModes instanceof Object[]) {
			try {
				int[] modes = TiConvert.toIntArray((Object[]) orientationModes);
				setOrientationModes(modes);

			} catch (ClassCastException e) {
				Log.e(TAG, "Invalid orientationMode array. Must only contain orientation mode constants.");
			}
		}
	}

	@Override
	public void onPropertyChanged(String name, Object value)
	{
		if (opening || opened)  {
			if (TiC.PROPERTY_EXIT_ON_CLOSE.equals(name)) {
				Activity activity = (tabGroupActivity != null) ? (Activity)(tabGroupActivity.get()) : null;
				if (activity != null) {
					Intent intent = activity.getIntent();
					intent.putExtra(TiC.INTENT_PROPERTY_FINISH_ROOT, TiConvert.toBoolean(value));
				}
			}
		}
		super.onPropertyChanged(name, value);
	}

	@Kroll.method
	public TabProxy getActiveTab() {
		if (TiApplication.isUIThread()) {
			return handleGetActiveTab();

		} else {
			return (TabProxy) TiMessenger.sendBlockingMainMessage(getMainHandler().obtainMessage(MSG_GET_ACTIVE_TAB,  tab));
		}
	}

	private TabProxy handleGetActiveTab() {
		//selectedTab may not be set when user queries activeTab, so we return
		//the first tab (default selected tab) if it exists.
		if (selectedTab != null) {
			return selectedTab;
		} else if (tabs.size() > 0) {
			return tabs.get(0);
		} else {
			return null;
		}
	}

	@Override
	protected void handleOpen(KrollDict options)
	{
		Activity topActivity = TiApplication.getAppCurrentActivity();
		// Don't open if app is closing or closed
		if (topActivity == null || topActivity.isFinishing()) {
			return;
		}
		Intent intent = new Intent(topActivity, TiActivity.class);
		fillIntent(topActivity, intent);

		int windowId = TiActivityWindows.addWindow(this);
		intent.putExtra(TiC.INTENT_PROPERTY_USE_ACTIVITY_WINDOW, true);
		intent.putExtra(TiC.INTENT_PROPERTY_WINDOW_ID, windowId);

		topActivity.startActivity(intent);
	}

	@Override
	public void windowCreated(TiBaseActivity activity, Bundle savedInstanceState) {
		tabGroupActivity = new WeakReference<AppCompatActivity>(activity);
		activity.setWindowProxy(this);
		activity.setLayoutProxy(this);
		setActivity(activity);

		if (activity.getSupportActionBar() != null) {
			view = new TiUIActionBarTabGroup(this, activity, savedInstanceState);
		} else {
			Log.e(TAG, "ActionBar not available for TabGroup");
			return;
		}

		setModelListener(view);

		handlePostOpen();

		// Push the tab group onto the window stack. It needs to intercept
		// stack changes to properly dispatch tab focus and blur events
		// when windows open and close on top of it.
		activity.addWindowToStack(this);

		// Need to handle the cached activity proxy properties in the JS side.
		callPropertySync(PROPERTY_POST_TAB_GROUP_CREATED, null);
	}

	@Override
	protected void handlePostOpen()
	{
		super.handlePostOpen();

		opened = true;
		opening = false;

		// First open before we load and focus our first tab.
		fireEvent(TiC.EVENT_OPEN, null);

		// Load any tabs added before the tab group opened.
		TiUIAbstractTabGroup tg = (TiUIAbstractTabGroup) view;
		for (TabProxy tab : tabs) {
			if (tab != null) {
				tg.addTab(tab);
			}
		}

		TabProxy activeTab = handleGetActiveTab();
		if (activeTab != null) {
			selectedTab = null;
			// If tabHost's selected tab is same as the active tab, we need
			// to invoke onTabSelected so focus/blur event fire appropriately
			if (tg.getSelectedTab() == activeTab) {
				onTabSelected(activeTab);
			} else {
				tg.selectTab(activeTab);
			}
		}

		// Selected tab should have been focused by now.
		// Prevent any duplicate events from firing by marking
		// this group has having focus.
		isFocused = true;
	}

	@Override
	protected void handleClose(KrollDict options)
	{
		Log.d(TAG, "handleClose: " + options, Log.DEBUG_MODE);

		modelListener = null;
		releaseViews();
		view = null;

		AppCompatActivity activity = tabGroupActivity.get();
		if (activity != null && !activity.isFinishing()) {
			activity.finish();
		}
	}

	@Override
	public void closeFromActivity(boolean activityIsFinishing) {
		// Allow each tab to close its window before the tab group closes.
		for (TabProxy tab : tabs) {
			tab.close(activityIsFinishing);
		}

		// Call super to fire the close event on the tab group.
		// This event must fire after each tab has been closed.
		super.closeFromActivity(activityIsFinishing);
	}

	@Override
	public void onWindowFocusChange(boolean focused) {
		// Do not dispatch duplicate focus events.
		// Duplicates may occur when the group opens because
		// both the initial tab selection and the activity resuming
		// will attempt to focus the tabs.
		if (isFocused == focused) {
			return;
		}
		isFocused = focused;

		if (selectedTab == null) {
			// If no tab is selected fall back to the default behavior.
			super.onWindowFocusChange(focused);
			return;
		}

		// When the tab group gains focus we need to re-focus
		// the currently selected tab. No UI state change is required
		// since no tab selection actually occurred. This should only
		// happen if the activity is paused or the window stack changed.
		selectedTab.onFocusChanged(focused, null);
	}

	/**
	 * Invoked when a tab in the group is selected.
	 *
	 * @param tabProxy the tab that was selected
	 */
	public void onTabSelected(TabProxy tabProxy) {
		TabProxy previousSelectedTab = selectedTab;
		selectedTab = tabProxy;

		// Focus event data which will be dispatched to the selected tab.
		// The 'source' of these events will always be the tab being focused.
		KrollDict focusEventData = new KrollDict();
		focusEventData.put(TiC.EVENT_PROPERTY_SOURCE, selectedTab);
		focusEventData.put(TiC.EVENT_PROPERTY_PREVIOUS_TAB, previousSelectedTab);
		focusEventData.put(TiC.EVENT_PROPERTY_PREVIOUS_INDEX, tabs.indexOf(previousSelectedTab));
		focusEventData.put(TiC.EVENT_PROPERTY_TAB, selectedTab);
		focusEventData.put(TiC.EVENT_PROPERTY_INDEX, tabs.indexOf(selectedTab));

		// We cannot modify event data after firing an event with it.
		// To change the 'source' to the previously selected tab we must clone it.
		KrollDict blurEventData = (KrollDict) focusEventData.clone();
		blurEventData.put(TiC.EVENT_PROPERTY_SOURCE, previousSelectedTab);

		// Notify the previously and currently selected tabs about the change.
		// Tab implementations should update their UI state and fire focus/blur events.
		if (previousSelectedTab != null) {
			previousSelectedTab.onSelectionChanged(false);
			previousSelectedTab.onFocusChanged(false, blurEventData);
		}
		selectedTab.onSelectionChanged(true);
		selectedTab.onFocusChanged(true, focusEventData);
	}

	private void fillIntent(Activity activity, Intent intent)
	{
		int windowFlags = 0;
		if (hasProperty(TiC.PROPERTY_WINDOW_FLAGS)) {
			windowFlags = TiConvert.toInt(getProperty(TiC.PROPERTY_WINDOW_FLAGS), 0);
		}

		//Set the fullscreen flag
		if (hasProperty(TiC.PROPERTY_FULLSCREEN)) {
			boolean flagVal = TiConvert.toBoolean(getProperty(TiC.PROPERTY_FULLSCREEN), false);
			if (flagVal) {
				windowFlags = windowFlags | WindowManager.LayoutParams.FLAG_FULLSCREEN;
			}
		}

		//Set the secure flag
		if (hasProperty(TiC.PROPERTY_FLAG_SECURE)) {
			boolean flagVal = TiConvert.toBoolean(getProperty(TiC.PROPERTY_FLAG_SECURE), false);
			if (flagVal) {
				windowFlags = windowFlags | WindowManager.LayoutParams.FLAG_SECURE;
			}
		}

		//Stuff flags in intent
		intent.putExtra(TiC.PROPERTY_WINDOW_FLAGS, windowFlags);

		if (hasProperty(TiC.PROPERTY_WINDOW_SOFT_INPUT_MODE)) {
			intent.putExtra(TiC.PROPERTY_WINDOW_SOFT_INPUT_MODE, TiConvert.toInt(getProperty(TiC.PROPERTY_WINDOW_SOFT_INPUT_MODE), -1));
		}

		if (hasProperty(TiC.PROPERTY_EXIT_ON_CLOSE)) {
			intent.putExtra(TiC.INTENT_PROPERTY_FINISH_ROOT, TiConvert.toBoolean(getProperty(TiC.PROPERTY_EXIT_ON_CLOSE), false));
		} else {
			intent.putExtra(TiC.INTENT_PROPERTY_FINISH_ROOT, activity.isTaskRoot());
		}
	}

	@Override
	public TiBlob handleToImage()
	{
		KrollDict d = TiUIHelper.viewToImage(new KrollDict(), getActivity().getWindow().getDecorView());
		return TiUIHelper.getImageFromDict(d);
	}

	@Override
	public void releaseViews()
	{
		super.releaseViews();
		if (tabs != null) {
			synchronized (tabs) {
				for (TabProxy t : tabs) {
					t.setTabGroup(null);
					t.releaseViews();
				}
			}
		}
	}

	@Override
	public void releaseViewsForActivityForcedToDestroy()
	{
		super.releaseViews();
		if (tabs != null) {
			synchronized (tabs) {
				for (TabProxy t : tabs) {
					// Need to keep the relationship between tabgroup and tabs, window and tab, window and tabgroup,
					// in order to recover from forced-destroy activity.
					t.releaseViewsForActivityForcedToDestroy();
				}
			}
		}
	}

	@Override
	protected AppCompatActivity getWindowActivity()
	{
		return (tabGroupActivity != null) ? tabGroupActivity.get() : null;
	}

	@Override
	public String getApiName()
	{
		return "Ti.UI.TabGroup";
	}
}
