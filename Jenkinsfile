#!groovy
library 'pipeline-library'

// Keep logs/reports/etc of last 30 builds, only keep build artifacts of last 3 builds
properties([buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '3'))])

// Some branch flags to alter behavior
def isPR = env.CHANGE_ID || false // CHANGE_ID is set if this is a PR. (We used to look whether branch name started with PR-, which would not be true for a branch from origin filed as PR)
def MAINLINE_BRANCH_REGEXP = /master|next|\d_\d_(X|\d)/ // a branch is considered mainline if 'master' or like: 6_2_X, 7_0_X, 6_2_1
def isMainlineBranch = (env.BRANCH_NAME ==~ MAINLINE_BRANCH_REGEXP)
def isGreenKeeper = env.BRANCH_NAME.startsWith('greenkeeper/') || 'greenkeeper[bot]'.equals(env.CHANGE_AUTHOR) // greenkeeper needs special handling to avoid using npm ci, and to use greenkeeper-lockfile

// These values could be changed manually on PRs/branches, but be careful we don't merge the changes in. We want this to be the default behavior for now!
// target branch of windows SDK to use and test suite to test with
def targetBranch = isGreenKeeper ? 'master' : (isPR ? env.CHANGE_TARGET : (env.BRANCH_NAME ?: 'master'))
def includeWindows = isMainlineBranch // Include Windows SDK if on a mainline branch, by default
// Note that the `includeWindows` flag also currently toggles whether we build for all OSes/platforms, or just iOS/Android for macOS
def runDanger = isPR // run Danger.JS if it's a PR by default. (should we also run on origin branches that aren't mainline?)
def publishToS3 = isMainlineBranch // publish zips to S3 if on mainline branch, by default

// Variables we can change
def nodeVersion = '8.9.1' // NOTE that changing this requires we set up the desired version on jenkins master first!
def npmVersion = 'latest' // We can change this without any changes to Jenkins. 5.7.1 is minimum to use 'npm ci'

// Variables which we assign and share between nodes
// Don't modify these yourself, these are generated during the build
def gitCommit = ''
def basename = ''
def vtag = ''
def isFirstBuildOnBranch = false // calculated by looking at S3's branches.json, used to help bootstrap new mainline branches between Windows/main SDK

def unitTests(os, nodeVersion, npmVersion, testSuiteBranch) {
	return {
		def labels = 'git && osx'
		if ('ios'.equals(os)) {
			labels = 'git && osx && xcode-10' // Use xcode-10 to make use of ios 12 APIs
		} else {
			labels = 'git && osx && android-emulator && android-sdk' // FIXME get working on windows/linux!
		}
		node(labels) {
			try {
				// Unarchive the osx build of the SDK (as a zip)
				sh 'rm -rf osx.zip' // delete osx.zip file if it already exists
				unarchive mapping: ['dist/mobilesdk-*-osx.zip': 'osx.zip'] // grab the osx zip from our current build
				def zipName = sh(returnStdout: true, script: 'ls osx.zip/dist/mobilesdk-*-osx.zip').trim()
				// if our test suite already exists, delete it...
				sh 'rm -rf titanium-mobile-mocha-suite'
				// clone the tests suite fresh
				// FIXME Clone once on initial node and use stash/unstash to ensure all OSes use exact same checkout revision
				dir('titanium-mobile-mocha-suite') {
					// TODO Do a shallow clone, using same credentials as from scm object
					try {
						timeout(5) {
							git changelog: false, poll: false, credentialsId: 'd05dad3c-d7f9-4c65-9cb6-19fef98fc440', url: 'https://github.com/appcelerator/titanium-mobile-mocha-suite.git', branch: testSuiteBranch
						}
					} catch (e) {
						def msg = "Failed to clone the titanium-mobile-mocha-suite test suite from branch ${testSuiteBranch}. Are you certain that the test suite repo has that branch created?"
						echo msg
						manager.addWarningBadge(msg)
						throw e
					}
				} // dir
				// copy over any overridden unit tests into this workspace
				sh 'rm -rf tests'
				unstash 'override-tests'
				sh 'cp -R tests/ titanium-mobile-mocha-suite'
				// Now run the unit test suite
				dir('titanium-mobile-mocha-suite') {
					nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
						ensureNPM(npmVersion)
						sh 'npm ci'
						dir('scripts') {
							try {
								if ('ios'.equals(os)) {
									timeout(20) {
										sh "node test.js -b ../../${zipName} -p ${os}"
									}
								} else {
									timeout(30) {
										sh "node test.js -C android-28-playstore-x86 -T emulator -b ../../${zipName} -p ${os}"
									}
								}
							} catch (e) {
								if ('ios'.equals(os)) {
									// Gather the crash report(s)
									def home = sh(returnStdout: true, script: 'printenv HOME').trim()
									// wait 1 minute, sometimes it's delayed in writing out crash reports to disk...
									sleep time: 1, unit: 'MINUTES'
									def crashFiles = sh(returnStdout: true, script: "ls -1 ${home}/Library/Logs/DiagnosticReports/").trim().readLines()
									for (int i = 0; i < crashFiles.size(); i++) {
										def crashFile = crashFiles[i]
										if (crashFile =~ /^mocha_.*\.crash$/) {
											sh "mv ${home}/Library/Logs/DiagnosticReports/${crashFile} ."
										}
									}
									archiveArtifacts 'mocha_*.crash'
									sh 'rm -f mocha_*.crash'
								} else {
									sh label: 'gather crash reports/tombstones for Android', returnStatus: true, script: 'adb -e pull /data/tombstones'
									archiveArtifacts 'tombstones/'
									sh 'rm -f tombstones/'
									// wipe tombstones and re-build dir with proper permissions/ownership on emulator
									sh returnStatus: true, script: 'adb -e shell rm -rf /data/tombstones'
									sh returnStatus: true, script: 'adb -e shell mkdir -m 771 /data/tombstones'
									sh returnStatus: true, script: 'adb -e shell chown system:system /data/tombstones'
								}
								throw e
							} finally {
								// Kill the emulators!
								if ('android'.equals(os)) {
									sh returnStatus: true, script: 'adb -e shell am force-stop com.appcelerator.testApp.testing'
									sh returnStatus: true, script: 'adb -e uninstall com.appcelerator.testApp.testing'
									killAndroidEmulators()
								} // if
							} // finally
							// save the junit reports as artifacts explicitly so danger.js can use them later
							stash includes: 'junit.*.xml', name: "test-report-${os}"
							junit 'junit.*.xml'
						} // dir('scripts')
					} // nodejs
				} // dir('titanium-mobile-mocha-suite')
			} finally {
				deleteDir()
			}
		}
	}
}

// Wrap in timestamper
timestamps {
	try {
		node('git && android-sdk && android-ndk && ant && gperf && osx && xcode-10') {
			stage('Checkout') {
				// Update our shared reference repo for all branches/PRs
				dir('..') {
					if (fileExists('titanium_mobile.git')) {
						dir('titanium_mobile.git') {
							sh 'git gc'
							sh 'git remote update -p' // update the clone
							sh 'git prune' // prune to avoid "warning: There are too many unreachable loose objects"
						}
					} else {
						sh 'git clone --mirror git@github.com:appcelerator/titanium_mobile.git' // create a mirror
					}
				}

				// checkout scm
				// Hack for JENKINS-37658 - see https://support.cloudbees.com/hc/en-us/articles/226122247-How-to-Customize-Checkout-for-Pipeline-Multibranch
				checkout([
					$class: 'GitSCM',
					branches: scm.branches,
					extensions: scm.extensions + [
						[$class: 'WipeWorkspace'],
						[$class: 'CloneOption', honorRefspec: true, noTags: true, reference: "${pwd()}/../titanium_mobile.git", shallow: true, depth: 30, timeout: 30]],
					userRemoteConfigs: scm.userRemoteConfigs
				])
				// FIXME: Workaround for missing env.GIT_COMMIT: http://stackoverflow.com/questions/36304208/jenkins-workflow-checkout-accessing-branch-name-and-git-commit
				gitCommit = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
			}

			nodejs(nodeJSInstallationName: "node ${nodeVersion}") {

				stage('Lint') {
					ensureNPM(npmVersion)

					// Install dependencies
					timeout(5) {
						sh 'npm ci'
					}
					// Run npm test, but record output in a file and check for failure of command by checking output
					if (fileExists('npm_test.log')) {
						sh 'rm -rf npm_test.log'
					}
					def npmTestResult = sh(returnStatus: true, script: 'npm test &> npm_test.log')
					if (runDanger) { // Stash files for danger.js later
						stash includes: 'package.json,package-lock.json,dangerfile.js,.eslintignore,.eslintrc,npm_test.log,android/**/*.java', name: 'danger'
					}
					// was it a failure?
					if (npmTestResult != 0) {
						error readFile('npm_test.log')
					}
				}

				// Skip the Windows SDK portion if a PR, we don't need it
				stage('Windows') {
					if (includeWindows) {
						// This may be the very first build on this branch, so there's no windows build to grab yet
						try {
							sh 'curl -O http://builds.appcelerator.com.s3.amazonaws.com/mobile/branches.json'
							if (fileExists('branches.json')) {
								def branchesJSONContents = readFile('branches.json')
								if (!branchesJSONContents.startsWith('<?xml')) { // May be an 'Access denied' xml file/response
									def branchesJSON = jsonParse(branchesJSONContents)
									isFirstBuildOnBranch = !(branchesJSON['branches'].contains(env.BRANCH_NAME))
								}
							}
						} catch (err) {
							// ignore? Not able to grab the branches.json, what should we assume? In 99.9% of the cases, it's not a new build
						}

						// If there's no windows build for this branch yet, use master
						def windowsBranch = targetBranch
						if (isFirstBuildOnBranch) {
							windowsBranch = 'master'
							manager.addWarningBadge("Looks like the first build on branch ${env.BRANCH_NAME}. Using 'master' branch build of Windows SDK to bootstrap.")
						}
						step([$class: 'CopyArtifact',
							projectName: "../titanium_mobile_windows/${windowsBranch}",
							selector: [$class: 'StatusBuildSelector', stable: false],
							filter: 'dist/windows/'])
						sh 'rm -rf windows; mv dist/windows/ windows/; rm -rf dist'
					} // if(includeWindows)
				} // stage

				stage('Build') {
					// Normal build, pull out the version
					def version = sh(returnStdout: true, script: 'sed -n \'s/^ *"version": *"//p\' package.json | tr -d \'"\' | tr -d \',\'').trim()
					echo "VERSION:         ${version}"
					// Create a timestamp
					def timestamp = sh(returnStdout: true, script: 'date +\'%Y%m%d%H%M%S\'').trim()
					echo "TIMESTAMP:       ${timestamp}"
					vtag = "${version}.v${timestamp}"
					echo "VTAG:            ${vtag}"
					basename = "dist/mobilesdk-${vtag}"
					echo "BASENAME:        ${basename}"

					// TODO parallelize the iOS/Android/Mobileweb/Windows portions?
					dir('build') {
						timeout(15) {
							sh "node scons.js build --android-ndk ${env.ANDROID_NDK_R16B} --android-sdk ${env.ANDROID_SDK}"
						} // timeout
						ansiColor('xterm') {
							timeout(15) {
								if (includeWindows) {
									sh "node scons.js package --version-tag ${vtag} --all"
								} else {
									sh "node scons.js package android ios --version-tag ${vtag}"
								}
							} // timeout
						} // ansiColor
					} // dir
					archiveArtifacts artifacts: "${basename}-*.zip"
					stash includes: 'dist/parity.html', name: 'parity'
					stash includes: 'tests/', name: 'override-tests'
				} // end 'Build' stage
			} // nodeJs
		} // end node for checkout/build

		// Run unit tests in parallel for android/iOS
		stage('Test') {
			parallel(
				'android unit tests': unitTests('android', nodeVersion, npmVersion, targetBranch),
				'iOS unit tests': unitTests('ios', nodeVersion, npmVersion, targetBranch),
				failFast: true
			)
		}

		stage('Deploy') {
			if (publishToS3) {
				// Now allocate a node for uploading artifacts to s3 and in Jenkins
				node('(osx || linux) && !axway-internal && curl') {
					def indexJson = []
					if (fileExists('index.json')) {
						sh 'rm -f index.json'
					}
					try {
						sh "curl -O http://builds.appcelerator.com.s3.amazonaws.com/mobile/${env.BRANCH_NAME}/index.json"
					} catch (err) {
						// ignore? Not able to grab the index.json, so assume it means it's a new branch
					}
					if (fileExists('index.json')) {
						def contents = readFile('index.json')
						if (!contents.startsWith('<?xml')) { // May be an 'Access denied' xml file/response
							indexJson = jsonParse(contents)
						} else {
							// we get access denied if it doesn't exist! Let's treat that as us needing to add branch to branches.json listing
							try {
								sh 'curl -O http://builds.appcelerator.com.s3.amazonaws.com/mobile/branches.json'
								if (fileExists('branches.json')) {
									def branchesJSONContents = readFile('branches.json')
									if (!branchesJSONContents.startsWith('<?xml')) { // May be an 'Access denied' xml file/response
										def branchesJSON = jsonParse(branchesJSONContents)
										if (!(branchesJSON['branches'].contains(env.BRANCH_NAME))) {
											// Update the branches.json on S3
											echo 'updating mobile/branches.json to include new branch...'
											branchesJSON['branches'] << env.BRANCH_NAME
											writeFile file: 'branches.json', text: new groovy.json.JsonBuilder(branchesJSON).toPrettyString()
											step([
												$class: 'S3BucketPublisher',
												consoleLogLevel: 'INFO',
												entries: [[
													bucket: 'builds.appcelerator.com/mobile',
													gzipFiles: false,
													selectedRegion: 'us-east-1',
													sourceFile: 'branches.json',
													uploadFromSlave: true,
													userMetadata: []
												]],
												profileName: 'builds.appcelerator.com',
												pluginFailureResultConstraint: 'FAILURE',
												userMetadata: []])
										}
									}
								}
							} catch (err) {
								// ignore? Not able to grab the branches.json, what should we assume? In 99.9% of the cases, it's not a new build
							}
						}
					}

					// unarchive zips
					sh 'rm -rf dist/'
					unarchive mapping: ['dist/': '.']
					// Have to use Java-style loop for now: https://issues.jenkins-ci.org/browse/JENKINS-26481
					def oses = ['osx', 'linux', 'win32']
					for (int i = 0; i < oses.size(); i++) {
						def os = oses[i]
						def sha1 = sh(returnStdout: true, script: "shasum ${basename}-${os}.zip").trim().split()[0]
						def filesize = Long.valueOf(sh(returnStdout: true, script: "wc -c < ${basename}-${os}.zip").trim())
						step([
							$class: 'S3BucketPublisher',
							consoleLogLevel: 'INFO',
							entries: [[
								bucket: "builds.appcelerator.com/mobile/${env.BRANCH_NAME}",
								gzipFiles: false,
								selectedRegion: 'us-east-1',
								sourceFile: "${basename}-${os}.zip",
								uploadFromSlave: true,
								userMetadata: [[key: 'sha1', value: sha1]]
							]],
							profileName: 'builds.appcelerator.com',
							pluginFailureResultConstraint: 'FAILURE',
							userMetadata: [
								[key: 'build_type', value: 'mobile'],
								[key: 'git_branch', value: env.BRANCH_NAME],
								[key: 'git_revision', value: gitCommit],
								[key: 'build_url', value: env.BUILD_URL]]
						])

						// Add the entry to index json!
						indexJson << [
							'filename': "mobilesdk-${vtag}-${os}.zip",
							'git_branch': env.BRANCH_NAME,
							'git_revision': gitCommit,
							'build_url': env.BUILD_URL,
							'build_type': 'mobile',
							'sha1': sha1,
							'size': filesize
						]
					}

					// Update the index.json on S3
					echo "updating mobile/${env.BRANCH_NAME}/index.json..."
					writeFile file: "index.json", text: new groovy.json.JsonBuilder(indexJson).toPrettyString()
					step([
						$class: 'S3BucketPublisher',
						consoleLogLevel: 'INFO',
						entries: [[
							bucket: "builds.appcelerator.com/mobile/${env.BRANCH_NAME}",
							gzipFiles: false,
							selectedRegion: 'us-east-1',
							sourceFile: 'index.json',
							uploadFromSlave: true,
							userMetadata: []
						]],
						profileName: 'builds.appcelerator.com',
						pluginFailureResultConstraint: 'FAILURE',
						userMetadata: []])

					// Upload the parity report
					unstash 'parity'
					sh "mv dist/parity.html ${basename}-parity.html"
					step([
						$class: 'S3BucketPublisher',
						consoleLogLevel: 'INFO',
						entries: [[
							bucket: "builds.appcelerator.com/mobile/${env.BRANCH_NAME}",
							gzipFiles: false,
							selectedRegion: 'us-east-1',
							sourceFile: "${basename}-parity.html",
							uploadFromSlave: true,
							userMetadata: []
						]],
						profileName: 'builds.appcelerator.com',
						pluginFailureResultConstraint: 'FAILURE',
						userMetadata: []])

					// Trigger titanium_mobile_windows if this is the first build on a "mainline" branch
					if (isFirstBuildOnBranch) {
						// Trigger build of titanium_mobile_windows in our pipeline multibranch group!
						build job: "../titanium_mobile_windows/${env.BRANCH_NAME}", wait: false
					}
					// Now wipe the workspace. otherwise the unstashed artifacts will stick around on the node (master)
					deleteDir()
				} // node
			} // if(publishToS3)
		} // stage
	} // try
	catch (err) {
		// TODO Use try/catch at lower level (like around tests) so we can give more detailed failures?
		currentBuild.result = 'FAILURE'

		throw err
	}
	finally {
		// Run Danger.JS at the end so we can provide useful comments/info to the PR/commit author
		if (runDanger) {
			stage('Danger') {
				node('osx || linux') {
					nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
						unstash 'danger' // this gives us dangerfile.js, package.json, package-lock.json, node_modules/, android java sources for format check
						// ok to not grab crash logs, still run Danger.JS
						try {
							unarchive mapping: ['mocha_*.crash': '.'] // unarchive any iOS simulator crashes
						} catch (e) {}
						// ok to not grab test results, still run Danger.JS
						try {
							unstash 'test-report-ios' // junit.ios.report.xml
						} catch (e) {}
						try {
							unstash 'test-report-android' // junit.android.report.xml
						} catch (e) {}
						ensureNPM(npmVersion)
						sh 'npm ci'
						// FIXME We need to hack the env vars for Danger.JS because it assumes Github Pull Request Builder plugin only
						// We use Github branch source plugin implicitly through pipeline job
						// See https://github.com/danger/danger-js/issues/379
						withEnv(["ZIPFILE=${basename}-osx.zip", "BUILD_STATUS=${currentBuild.currentResult}","DANGER_JS_APP_INSTALL_ID=''"]) {
							// FIXME Can't pass along env variables properly, so we cheat and write them as a JSON file we can require
							sh 'node -p \'JSON.stringify(process.env)\' > env.json'
							sh returnStatus: true, script: 'npx danger ci --verbose' // Don't fail build if danger fails. We want to retain existing build status.
						} // withEnv
					} // nodejs
					deleteDir()
				} // node
			} // Danger stage
		} // if(runDanger)
	}
}
