/**
* iOS module build command.
*
* @module cli/_buildModule
*
* @copyright
* Copyright (c) 2014-2017 by Appcelerator, Inc. All Rights Reserved.
*
* @license
* Licensed under the terms of the Apache Public License
* Please see the LICENSE included with this distribution for details.
*/

'use strict';

const appc = require('node-appc'),
	AdmZip = require('adm-zip'),
	archiver = require('archiver'),
	async = require('async'),
	Builder = require('node-titanium-sdk/lib/builder'),
	ioslib = require('ioslib'),
	iosPackageJson = appc.pkginfo.package(module),
	jsanalyze = require('node-titanium-sdk/lib/jsanalyze'),
	ejs = require('ejs'),
	fs = require('fs'),
	markdown = require('markdown').markdown,
	path = require('path'),
	spawn = require('child_process').spawn, // eslint-disable-line security/detect-child-process
	temp = require('temp'),
	util = require('util'),
	wrench = require('wrench'),
	__ = appc.i18n(__dirname).__,
	series = appc.async.series;

function iOSModuleBuilder() {
	Builder.apply(this, arguments);
}

util.inherits(iOSModuleBuilder, Builder);

iOSModuleBuilder.prototype.validate = function validate(logger, config, cli) {
	Builder.prototype.config.apply(this, arguments);
	Builder.prototype.validate.apply(this, arguments);

	// cli.manifest is set by the --project-dir option's callback in cli/commands/build.js
	this.manifest      = cli.manifest;
	this.moduleId      = cli.manifest.moduleid;
	this.moduleName    = cli.manifest.name;
	this.moduleVersion = cli.manifest.version;
	this.moduleGuid    = cli.manifest.guid;

	this.buildOnly     = cli.argv['build-only'];
	this.xcodeEnv      = null;

	return function (finished) {
		ioslib.detect({
			// env
			xcodeSelect:       config.get('osx.executables.xcodeSelect'),
			security:          config.get('osx.executables.security'),
			// provisioning
			profileDir:        config.get('ios.profileDir'),
			// xcode
			searchPath:        config.get('paths.xcode'),
			minIosVersion:     iosPackageJson.minIosVersion,
			supportedVersions: iosPackageJson.vendorDependencies.xcode
		}, function (err, iosInfo) {
			this.iosInfo = iosInfo;
			this.xcodeEnv = this.iosInfo.selectedXcode;

			if (!this.xcodeEnv) {
				// this should never happen
				logger.error(__('Unable to find suitable Xcode install') + '\n');
				process.exit(1);
			}

			finished();
		}.bind(this));
	}.bind(this);
};

iOSModuleBuilder.prototype.run = function run(logger, config, cli, finished) {
	Builder.prototype.run.apply(this, arguments);

	series(this, [
		function (next) {
			cli.emit('build.module.pre.construct', this, next);
		},

		'doAnalytics',
		'initialize',
		'loginfo',

		function (next) {
			cli.emit('build.module.pre.compile', this, next);
		},

		'processLicense',
		'processTiXcconfig',
		'compileJS',
		'buildModule',
		'createUniversalBinary',
		'verifyBuildArch',
		'packageModule',
		'runModule',

		function (next) {
			cli.emit('build.module.post.compile', this, next);
		}
	], function (err) {
		cli.emit('build.module.finalize', this, function () {
			finished(err);
		});
	});
};

iOSModuleBuilder.prototype.doAnalytics = function doAnalytics() {
	const cli = this.cli,
		eventName = 'ios.' + cli.argv.type;

	cli.addAnalyticsEvent(eventName, {
		dir:         this.cli.argv['project-dir'],
		name:        this.moduleName,
		publisher:   this.manifest.author,
		appid:       this.moduleId,
		description: this.manifest.description,
		type:        this.cli.argv.type,
		guid:        this.moduleGuid,
		version:     this.moduleVersion,
		copyright:   this.manifest.copyright,
		date:        new Date().toDateString()
	});
};

iOSModuleBuilder.prototype.initialize = function initialize() {
	this.moduleIdAsIdentifier
		= this.moduleId
			.replace(/[\s-]/g, '_')
			.replace(/_+/g, '_')
			.split(/\./)
			.map(function (s) {
				return s.substring(0, 1).toUpperCase() + s.substring(1);
			}).join('');
	this.tiSymbols = {};
	this.metaData = [];
	this.metaDataFile = path.join(this.projectDir, 'metadata.json');
	this.manifestFile = path.join(this.projectDir, 'manifest');
	this.templatesDir = path.join(this.platformPath, 'templates');
	this.assetsTemplateFile = path.join(this.templatesDir, 'module', 'default', 'template', 'iphone', 'Classes', '{{ModuleIdAsIdentifier}}ModuleAssets.m.ejs');
	this.universalBinaryDir = path.join(this.projectDir, 'build');

	[ 'assets', 'documentation', 'example', 'platform', 'Resources' ].forEach(function (folder) {
		var dirName = folder.toLowerCase() + 'Dir';
		this[dirName] = path.join(this.projectDir, folder);
		if (!fs.existsSync(this[dirName])) {
			this[dirName] = path.join(this.projectDir, '..', folder);
		}
	}, this);

	this.hooksDir = path.join(this.projectDir, 'hooks');
	this.sharedHooksDir = path.resolve(this.projectDir, '..', 'hooks');

	this.licenseDefault = 'TODO: place your license here and we\'ll include it in the module distribution';
	this.licenseFile = path.join(this.projectDir, 'LICENSE');
	if (!fs.existsSync(this.licenseFile)) {
		this.licenseFile = path.join(this.projectDir, '..', 'LICENSE');
	}

	this.tiXcconfig = {};
	this.tiXcconfigFile = path.join(this.projectDir, 'titanium.xcconfig');

	this.moduleXcconfigFile = path.join(this.projectDir, 'module.xcconfig');
};

iOSModuleBuilder.prototype.loginfo = function loginfo() {
	this.logger.debug(__('Titanium SDK iOS directory: %s', this.platformPath.cyan));
	this.logger.info(__('Project directory: %s', this.projectDir.cyan));
	this.logger.info(__('Module ID: %s', this.moduleId.cyan));
};

iOSModuleBuilder.prototype.dirWalker = function dirWalker(currentPath, callback) {
	fs.readdirSync(currentPath).forEach(function (name, i, arr) {
		var currentFile = path.join(currentPath, name);
		if (fs.statSync(currentFile).isDirectory()) {
			this.dirWalker(currentFile, callback);
		} else {
			callback(currentFile, name, i, arr);
		}
	}, this);
};

iOSModuleBuilder.prototype.processLicense = function processLicense() {
	if (fs.existsSync(this.licenseFile) && fs.readFileSync(this.licenseFile).toString().indexOf(this.licenseDefault) !== -1) {
		this.logger.warn(__('Please update the LICENSE file with your license text before distributing.'));
	}
};

iOSModuleBuilder.prototype.processTiXcconfig = function processTiXcconfig(next) {
	const re = /^(\S+)\s*=\s*(.*)$/,
		bindingReg = /\$\(([^$]+)\)/g;

	if (fs.existsSync(this.tiXcconfigFile)) {
		fs.readFileSync(this.tiXcconfigFile).toString().split('\n').forEach(function (line) {
			const match = line.match(re);
			if (match) {
				const keyList = [];
				let value = match[2].trim();

				let bindingMatch = bindingReg.exec(value);
				if (bindingMatch) {
					while (bindingMatch) {
						keyList.push(bindingMatch[1]);
						bindingMatch = bindingReg.exec(value);
					}

					keyList.forEach(function (key) {
						if (this.tiXcconfig[key]) {
							value = value.replace('$(' + key + ')', this.tiXcconfig[key]);
						}
					}, this);
				}
				this.tiXcconfig[match[1].trim()] = value;
			}
		}, this);
	}

	next();
};

iOSModuleBuilder.prototype.compileJS = function compileJS(next) {
	this.jsFilesToEncrypt = [];

	const moduleJS = this.moduleId + '.js',
		jsFile = path.join(this.assetsDir, moduleJS),
		renderData = {
			'moduleIdAsIdentifier' : this.moduleIdAsIdentifier,
			'mainEncryptedAssetReturn': 'return filterDataInRange([NSData dataWithBytesNoCopy:data length:sizeof(data) freeWhenDone:NO], ranges[0]);',
			'allEncryptedAssetsReturn': 'NSNumber *index = [map objectForKey:path];'
				+ '\n\t\tif (index == nil) {\n\t\t\treturn nil;\n\t\t}'
				+ '\n\t\treturn filterDataInRange([NSData dataWithBytesNoCopy:data length:sizeof(data) freeWhenDone:NO], ranges[index.integerValue]);'
		},
		titaniumPrepHook = this.cli.createHook('build.ios.titaniumprep', this, function (exe, args, opts, done) {
			const jsFilesToEncrypt = opts.jsFiles,
				placeHolderName = opts.placeHolder;
			let tries = 0,
				completed = false;

			this.logger.info('Encrypting JavaScript files: %s', (exe + ' "' + args.slice(0, -1).join('" "') + '"').cyan);
			jsFilesToEncrypt.forEach(function (file) {
				this.logger.debug(__('Preparing %s', file.cyan));
			}, this);

			async.whilst(
				function () {
					if (tries > 3) {
						// we failed 3 times, so just give up
						this.logger.error(__('titanium_prep failed to complete successfully'));
						this.logger.error(__('Try cleaning this project and build again') + '\n');
						process.exit(1);
					}
					return !completed;
				},
				function (cb) {
					const child = spawn(exe, args, opts),
						relativePaths = [],
						basepath = args[1];
					let out = '';

					// titanium_prep is dumb and assumes all paths are relative to the assets dir we passed in as an argument
					// So we *must* chop the paths down to relative paths
					jsFilesToEncrypt.forEach(function (file) {
						relativePaths.push(path.relative(basepath, file));
					}, this);

					child.stdin.write(relativePaths.join('\n'));
					child.stdin.end();

					child.stdout.on('data', function (data) {
						out += data.toString();
					});

					child.on('close', function (code) {
						if (code) {
							this.logger.error(__('titanium_prep failed to run (%s)', code) + '\n');
							process.exit(1);
						}

						if (out.indexOf('initWithObjectsAndKeys') !== -1) {
							// success!
							renderData[placeHolderName] = out;

							completed = true;
						} else {
							// failure, maybe it was a fluke, try again
							this.logger.warn(__('titanium_prep failed to complete successfully, trying again'));
							tries++;
						}
						cb();
					}.bind(this));
				}.bind(this),
				done
			);
		});

	const tasks = [
		// 1. compile module js
		function (cb) {
			fs.existsSync(jsFile) && this.jsFilesToEncrypt.push(jsFile);

			if (!this.jsFilesToEncrypt.length) {
				renderData.mainEncryptedAsset = '';
				renderData.mainEncryptedAssetReturn = 'return nil;';
				return cb();
			}

			fs.existsSync(this.assetsDir) || wrench.mkdirSyncRecursive(this.assetsDir);

			titaniumPrepHook(
				path.join(this.platformPath, 'titanium_prep'),
				[ this.moduleId, this.assetsDir, this.moduleGuid ],
				{ 'jsFiles': this.jsFilesToEncrypt, 'placeHolder': 'mainEncryptedAsset' },
				cb
			);
		},

		// 2. compile all other js files in assets dir
		function (cb) {
			try {
				if (!fs.existsSync(this.assetsDir)) {
					throw new Error();
				}

				this.dirWalker(this.assetsDir, function (file) {
					if (path.extname(file) === '.js' && this.jsFilesToEncrypt.indexOf(file) === -1) {
						this.jsFilesToEncrypt.push(file);
					}
				}.bind(this));

				const jsFilesCount = this.jsFilesToEncrypt.length;

				if (jsFilesCount === 0 || (fs.existsSync(jsFile) && jsFilesCount === 1)) {
					throw new Error();
				}

				titaniumPrepHook(
					path.join(this.platformPath, 'titanium_prep'),
					[ this.moduleId, this.assetsDir, this.moduleGuid ],
					{ 'jsFiles': this.jsFilesToEncrypt, 'placeHolder': 'allEncryptedAssets' },
					cb
				);
			} catch (e) {
				renderData.allEncryptedAssets = renderData.mainEncryptedAsset;
				renderData.allEncryptedAssetsReturn = 'return nil;';
				cb();
			}
		},

		// 3. write encrypted data to template
		function (cb) {
			const data = ejs.render(fs.readFileSync(this.assetsTemplateFile).toString(), renderData),
				moduleAssetsDir = path.join(this.projectDir, 'Classes'),
				moduleAssetsFile = path.join(moduleAssetsDir, this.moduleIdAsIdentifier + 'ModuleAssets.m');

			this.logger.debug(__('Writing module assets file: %s', moduleAssetsFile.cyan));
			fs.existsSync(moduleAssetsDir) || wrench.mkdirSyncRecursive(moduleAssetsDir);
			fs.writeFileSync(moduleAssetsFile, data);
			cb();
		},

		// 4. generate exports
		function (cb) {
			this.jsFilesToEncrypt.forEach(function (file) {
				const r = jsanalyze.analyzeJsFile(file, { minify: true });
				this.tiSymbols[file] = r.symbols;
				this.metaData.push.apply(this.metaData, r.symbols);
			}.bind(this));

			fs.existsSync(this.metaDataFile) && fs.unlinkSync(this.metaDataFile);
			fs.writeFileSync(this.metaDataFile, JSON.stringify({ 'exports': this.metaData }));

			cb();
		}
	];

	appc.async.series(this, tasks, next);
};

iOSModuleBuilder.prototype.buildModule = function buildModule(next) {
	const opts = {
		cwd: this.projectDir,
		env: {}
	};
	Object.keys(process.env).forEach(function (key) {
		opts.env[key] = process.env[key];
	});
	opts.env.DEVELOPER_DIR = this.xcodeEnv.path;

	const xcodebuildHook = this.cli.createHook('build.module.ios.xcodebuild', this, function (exe, args, opts, type, done) {
		this.logger.debug(__('Running: %s', ('DEVELOPER_DIR=' + opts.env.DEVELOPER_DIR + ' ' + exe + ' ' + args.join(' ')).cyan));
		const p = spawn(exe, args, opts),
			out = [],
			err = [];
		let stopOutputting = false;

		p.stdout.on('data', function (data) {
			data.toString().split('\n').forEach(function (line) {
				if (line.length) {
					out.push(line);
					if (line.indexOf('Failed to minify') !== -1) {
						stopOutputting = true;
					}
					if (!stopOutputting) {
						this.logger.trace('[' + type + '] ' + line);
					}
				}
			}, this);
		}.bind(this));

		p.stderr.on('data', function (data) {
			data.toString().split('\n').forEach(function (line) {
				if (line.length) {
					err.push(line);
				}
			}, this);
		}.bind(this));

		p.on('close', function (code) {
			if (code) {
				// just print the entire error buffer
				err.forEach(function (line) {
					this.logger.error('[' + type + '] ' + line);
				}, this);
				this.logger.log();
				process.exit(1);
			}

			// end of the line
			done(code);
		}.bind(this));
	}.bind(this));

	let count = 0;
	function done() {
		if (++count === 2) {
			next();
		}
	}

	// Create a build for the device
	xcodebuildHook(this.xcodeEnv.executables.xcodebuild, [
		'-configuration', 'Release',
		'-sdk', 'iphoneos'
	], opts, 'xcode-dist', done);

	// Create a build for the simulator
	xcodebuildHook(this.xcodeEnv.executables.xcodebuild, [
		'-configuration', 'Release',
		'-sdk', 'iphonesimulator'
	], opts, 'xcode-sim', done);
};

iOSModuleBuilder.prototype.createUniversalBinary = function createUniversalBinary(next) {
	const findLib = function (dest) {
		let lib = path.join(this.projectDir, 'build', 'Release-' + dest, 'lib' + this.moduleId + '.a');
		if (!fs.existsSync(lib)) {
			// unfortunately the initial module project template incorrectly
			// used the camel-cased module id
			lib = path.join(this.projectDir, 'build', 'Release-' + dest, 'lib' + this.moduleIdAsIdentifier + '.a');
			if (!fs.existsSync(lib)) {
				return new Error(__('Unable to find the built %s library', 'Release-' + dest));
			}
		}
		return lib;
	}.bind(this);

	// Create a universal build by merging the all builds to a single binary
	const args = [];

	let lib = findLib('iphoneos');
	if (lib instanceof Error) {
		return next(lib);
	}
	args.push(lib);

	lib = findLib('iphonesimulator');
	if (lib instanceof Error) {
		return next(lib);
	}
	args.push(lib);

	args.push(
		'-create',
		'-output',
		path.join(this.projectDir, 'build', 'lib' + this.moduleId + '.a')
	);

	this.logger.info(__('Creating universal library'));
	this.logger.debug(__('Running: %s', (this.xcodeEnv.executables.lipo + ' ' + args.join(' ')).cyan));

	appc.subprocess.run(this.xcodeEnv.executables.lipo, args, function (code, out, err) {
		if (code) {
			this.logger.error(__('Failed to generate universal binary (code %s):', code));
			this.logger.error(err.trim() + '\n');
			process.exit(1);
		}

		next();
	}.bind(this));
};

iOSModuleBuilder.prototype.verifyBuildArch = function verifyBuildArch(next) {
	const args = [ '-info', path.join(this.projectDir, 'build', 'lib' + this.moduleId + '.a') ];

	this.logger.info(__('Verifying universal library'));
	this.logger.debug(__('Running: %s', (this.xcodeEnv.executables.lipo + ' ' + args.join(' ')).cyan));

	appc.subprocess.run(this.xcodeEnv.executables.lipo, args, function (code, out, err) {
		if (code) {
			this.logger.error(__('Unable to determine the compiled module\'s architecture (code %s):', code));
			this.logger.error(err.trim() + '\n');
			process.exit(1);
		}

		const manifestArchs = this.manifest.architectures.split(' '),
			buildArchs    = out.substr(out.lastIndexOf(':') + 1).trim().split(' '),
			buildDiff     = manifestArchs.filter(function (i) { return buildArchs.indexOf(i) < 0; });

		if (buildArchs.length !== manifestArchs.length || buildDiff.length > 0) {
			this.logger.error(__('There is discrepancy between the architectures specified in module manifest and compiled binary.'));
			this.logger.error(__('Architectures in manifest: %s', manifestArchs.join(', ')));
			this.logger.error(__('Compiled binary architectures: %s', buildArchs.join(', ')));
			this.logger.error(__('Please update manifest to match module binary architectures.') + '\n');
			process.exit(1);
		}

		if (buildArchs.indexOf('arm64') === -1) {
			this.logger.warn(__('The module is missing 64-bit support.'));
		}

		next();
	}.bind(this));
};

iOSModuleBuilder.prototype.packageModule = function packageModule(next) {
	const dest = archiver('zip', {
			forceUTC: true
		}),
		origConsoleError = console.error,
		moduleId = this.moduleId,
		version = this.moduleVersion,
		moduleZipName = [ moduleId, '-iphone-', version, '.zip' ].join(''),
		moduleZipFullPath = path.join(this.projectDir, moduleZipName),
		moduleFolders = path.join('modules', 'iphone', moduleId, version),
		binarylibName = 'lib' + moduleId + '.a',
		binarylibFile = path.join(this.projectDir, 'build', binarylibName);

	this.moduleZipPath = moduleZipFullPath;

	// since the archiver library didn't set max listeners, we squelch all error output
	console.error = function () {};

	try {
		// if the zip file is there, remove it
		fs.existsSync(moduleZipFullPath) && fs.unlinkSync(moduleZipFullPath);
		const zipStream = fs.createWriteStream(moduleZipFullPath);
		zipStream.on('close', function () {
			console.error = origConsoleError;
			next();
		});
		dest.catchEarlyExitAttached = true; // silence exceptions
		dest.pipe(zipStream);

		this.logger.info(__('Creating module zip'));

		// 1. documentation folder
		const mdRegExp = /\.md$/;
		(function walk(dir, parent) {
			if (!fs.existsSync(dir)) {
				return;
			}

			fs.readdirSync(dir).forEach(function (name) {
				const file = path.join(dir, name);
				if (!fs.existsSync(file)) {
					return;
				}
				if (fs.statSync(file).isDirectory()) {
					return walk(file, path.join(parent, name));
				}

				let contents = fs.readFileSync(file).toString();

				if (mdRegExp.test(name)) {
					contents = markdown.toHTML(contents);
					name = name.replace(/\.md$/, '.html');
				}

				dest.append(contents, { name: path.join(parent, name) });
			});
		}(this.documentationDir, path.join(moduleFolders, 'documentation')));

		// 2. example folder
		this.dirWalker(this.exampleDir, function (file) {
			dest.append(fs.createReadStream(file), { name: path.join(moduleFolders, 'example', path.relative(this.exampleDir, file)) });
		}.bind(this));

		// 3. platform folder
		if (fs.existsSync(this.platformDir)) {
			this.dirWalker(this.platformDir, function (file) {
				dest.append(fs.createReadStream(file), { name: path.join(moduleFolders, 'platform', path.relative(this.platformDir, file)) });
			}.bind(this));
		}

		// 4. hooks folder
		const hookFiles = {};
		if (fs.existsSync(this.hooksDir)) {
			this.dirWalker(this.hooksDir, function (file) {
				const relFile = path.relative(this.hooksDir, file);
				hookFiles[relFile] = 1;
				dest.append(fs.createReadStream(file), { name: path.join(moduleFolders, 'hooks', relFile) });
			}.bind(this));
		}
		if (fs.existsSync(this.sharedHooksDir)) {
			this.dirWalker(this.sharedHooksDir, function (file) {
				var relFile = path.relative(this.sharedHooksDir, file);
				if (!hookFiles[relFile]) {
					dest.append(fs.createReadStream(file), { name: path.join(moduleFolders, 'hooks', relFile) });
				}
			}.bind(this));
		}

		// 5. Resources folder
		if (fs.existsSync(this.resourcesDir)) {
			this.dirWalker(this.resourcesDir, function (file, name) {
				if (name !== 'README.md') {
					dest.append(fs.createReadStream(file), { name: path.join(moduleFolders, 'Resources', path.relative(this.resourcesDir, file)) });
				}
			}.bind(this));
		}

		// 6. assets folder, not including js files
		if (fs.existsSync(this.assetsDir)) {
			this.dirWalker(this.assetsDir, function (file) {
				if (path.extname(file) !== '.js') {
					dest.append(fs.createReadStream(file), { name: path.join(moduleFolders, 'assets', path.relative(this.assetsDir, file)) });
				}
			}.bind(this));
		}

		// 7. the merge *.a file
		// 8. LICENSE file
		// 9. manifest
		dest.append(fs.createReadStream(binarylibFile), { name: path.join(moduleFolders, binarylibName) });
		dest.append(fs.createReadStream(this.licenseFile), { name: path.join(moduleFolders, 'LICENSE') });
		dest.append(fs.createReadStream(this.manifestFile), { name: path.join(moduleFolders, 'manifest') });

		// 10. module.xcconfig
		if (fs.existsSync(this.moduleXcconfigFile)) {
			let contents = fs.readFileSync(this.moduleXcconfigFile).toString();

			contents = '// This flag is generated by the module build, do not change it.\nTI_MODULE_VERSION=' + this.moduleVersion + '\n\n' + contents;

			dest.append(contents, { name: path.join(moduleFolders, 'module.xcconfig') });
		}

		// 11. metadata.json
		dest.append(fs.createReadStream(this.metaDataFile), { name: path.join(moduleFolders, 'metadata.json') });

		this.logger.info(__('Writing module zip: %s', moduleZipFullPath));
		dest.finalize();
	} catch (ex) {
		throw ex;
	} finally {
		console.error = origConsoleError;
	}
};

iOSModuleBuilder.prototype.runModule = function runModule(next) {
	if (this.buildOnly) {
		return next();
	}

	const tmpDir = temp.path('ti-ios-module-build-'),
		tmpProjectDir = path.join(tmpDir, this.moduleName),
		logger = this.logger;

	function log(data) {
		data.toString().split('\n').forEach(function (line) {
			if (line = line.trim()) {
				logger.trace(line);
			}
		});
	}

	function runTiCommand(args, callback) {
		logger.debug(__('Running: %s', ('titanium ' + args.join(' ')).cyan));
		const child = spawn('titanium', args);

		child.stdout.on('data', log);
		child.stderr.on('data', log);

		child.on('close', function (code) {
			if (code) {
				logger.error(__('Failed to run ti %s', args[0]));
				logger.log();
				process.exit(1);
			}
			callback();
		});
	}

	series(this, [
		function (cb) {
			// 1. create temp dir
			wrench.mkdirSyncRecursive(tmpDir);

			// 2. create temp proj
			this.logger.debug(__('Staging module project at %s', tmpDir.cyan));
			runTiCommand(
				[
					'create',
					'--id', this.moduleId,
					'-n', this.moduleName,
					'-t', 'app',
					'-u', 'localhost',
					'-d', tmpDir,
					'-p', 'ios',
					'--force',
					'--no-prompt',
					'--no-progress-bars',
					'--no-colors'
				],
				cb
			);
		},

		function (cb) {
			this.logger.debug(__('Created temp project %s', tmpProjectDir.cyan));

			// 3. patch tiapp.xml with module id
			const data = fs.readFileSync(path.join(tmpProjectDir, 'tiapp.xml')).toString();
			const result = data.replace(/<modules>/g, '<modules>\n\t\t<module platform="iphone">' + this.moduleId + '</module>');
			fs.writeFileSync(path.join(tmpProjectDir, 'tiapp.xml'), result);

			// 4. copy files in example to Resource
			appc.fs.copyDirSyncRecursive(
				this.exampleDir,
				path.join(tmpProjectDir, 'Resources'),
				{
					preserve: true,
					logger: this.logger.debug
				}
			);

			// 5. unzip module to the tmp dir
			const zip = new AdmZip(this.moduleZipPath);
			zip.extractAllTo(tmpProjectDir, true);

			cb();
		},

		function (cb) {
			// 6. run the app
			this.logger.debug(__('Running example project...', tmpDir.cyan));
			runTiCommand(
				[
					'build',
					'-p', 'ios',
					'-d', tmpProjectDir,
					'--no-prompt',
					'--no-colors',
					'--no-progress-bars'
				],
				cb
			);
		}
	], next);
};

// create the builder instance and expose the public api
(function (iOSModuleBuilder) {
	exports.validate = iOSModuleBuilder.validate.bind(iOSModuleBuilder);
	exports.run      = iOSModuleBuilder.run.bind(iOSModuleBuilder);
}(new iOSModuleBuilder(module)));
