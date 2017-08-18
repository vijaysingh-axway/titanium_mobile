/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2016 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
#ifdef USE_TI_MEDIA

#import "TiProxy.h"
#import <AudioToolbox/AudioServices.h>

@interface TiMediaSystemAlertProxy : TiProxy {
  NSURL *url;
  SystemSoundID sound;
}

@property (nonatomic, readonly) NSURL *url;

- (void)play:(id)args;

@end

#endif
