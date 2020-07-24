/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2013 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package org.appcelerator.titanium.util;

import android.graphics.Bitmap;
import androidx.collection.LruCache;

public class TiImageLruCache extends LruCache<Integer, Bitmap>
{
	// Get max available VM memory, exceeding this amount will throw an
	// OutOfMemory exception. Stored in kilobytes as LruCache takes an
	// int in its constructor.
	private static final int maxMemory = (int) (Runtime.getRuntime().maxMemory() / 1024);

	// Use 1/8th of the available memory for this memory cache.
	private static final int cacheSize = maxMemory / 8;

	protected static TiImageLruCache _instance;

	public static TiImageLruCache getInstance()
	{
		if (_instance == null) {
			_instance = new TiImageLruCache();
		}
		return _instance;
	}

	public TiImageLruCache()
	{
		super(cacheSize);
	}

	@Override
	protected int sizeOf(Integer key, Bitmap bitmap)
	{
		int byteCount = bitmap.getRowBytes() * bitmap.getHeight();
		return byteCount / 1024;
	}
}
