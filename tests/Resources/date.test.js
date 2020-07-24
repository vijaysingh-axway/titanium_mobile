/*
 * Appcelerator Titanium Mobile
 * Copyright (c) 2018-Present by Axway, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
/* eslint-env mocha */

/* eslint no-unused-expressions: "off" */
'use strict';
const should = require('./utilities/assertions');

describe('Date', function () {
	it('#toLocaleString()', () => {
		// 2020-March-1st
		const date = new Date(Date.UTC(2020, 2, 1));
		const options = {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			timeZone: 'UTC'
		};

		should(date.toLocaleString).not.be.undefined();
		should(date.toLocaleString).be.a.Function();
		should(date.toLocaleString()).be.a.String();
		should(date.toLocaleString('en-US')).be.a.String();
		should(date.toLocaleString([ 'en-US' ])).be.a.String();
		should(date.toLocaleString([ 'en-US', 'de-DE' ])).be.a.String();
		should(date.toLocaleString(undefined, options)).be.a.String();
		should(date.toLocaleString('en-US', options)).be.a.String();
		should(date.toLocaleString([ 'en-US' ], options)).be.a.String();
		should(date.toLocaleString([ 'en-US', 'de-DE' ], options)).be.a.String();

		should(date.toLocaleString('en-US', options)).be.eql('3/1/2020');
		should(date.toLocaleString('de-DE', options)).be.eql('1.3.2020');
		should(date.toLocaleString('ja-JP', options)).be.eql('2020/3/1');
	});

	it('#toLocaleDateString()', () => {
		// 2020-March-1st
		const date = new Date(Date.UTC(2020, 2, 1));
		const options = {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			timeZone: 'UTC'
		};

		should(date.toLocaleDateString).not.be.undefined();
		should(date.toLocaleDateString).be.a.Function();
		should(date.toLocaleDateString()).be.a.String();
		should(date.toLocaleDateString('en-US')).be.a.String();
		should(date.toLocaleDateString([ 'en-US' ])).be.a.String();
		should(date.toLocaleDateString([ 'en-US', 'de-DE' ])).be.a.String();
		should(date.toLocaleDateString(undefined, options)).be.a.String();
		should(date.toLocaleDateString('en-US', options)).be.a.String();
		should(date.toLocaleDateString([ 'en-US' ], options)).be.a.String();
		should(date.toLocaleDateString([ 'en-US', 'de-DE' ], options)).be.a.String();

		should(date.toLocaleDateString('en-US', options)).be.eql('3/1/2020');
		should(date.toLocaleDateString('de-DE', options)).be.eql('1.3.2020');
		should(date.toLocaleDateString('ja-JP', options)).be.eql('2020/3/1');
	});

	it('#toLocaleTimeString()', () => {
		// 2020-Jan-1st 08:02:05 PM
		const date = new Date(Date.UTC(2020, 0, 1, 20, 2, 5));
		const options = {
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit',
			hour12: true,
			dayPeriod: 'narrow',
			timeZone: 'UTC'
		};

		should(date.toLocaleTimeString).not.be.undefined();
		should(date.toLocaleTimeString).be.a.Function();
		should(date.toLocaleTimeString()).be.a.String();
		should(date.toLocaleTimeString('en-US')).be.a.String();
		should(date.toLocaleTimeString([ 'en-US' ])).be.a.String();
		should(date.toLocaleTimeString([ 'en-US', 'de-DE' ])).be.a.String();
		should(date.toLocaleTimeString(undefined, options)).be.a.String();
		should(date.toLocaleTimeString('en-US', options)).be.a.String();
		should(date.toLocaleTimeString([ 'en-US' ], options)).be.a.String();
		should(date.toLocaleTimeString([ 'en-US', 'de-DE' ], options)).be.a.String();

		should(date.toLocaleTimeString('en-US', options)).be.eql('8:02:05 PM');
		should(date.toLocaleTimeString('de-DE', options)).be.equalOneOf([ '8:02:05 PM', '8:02:05 nachm.' ]);
	});
});
