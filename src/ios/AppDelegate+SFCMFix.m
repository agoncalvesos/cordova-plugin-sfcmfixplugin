/********* AppDelegate+SFCMFix.m Cordova Plugin Implementation *******/

#import <Cordova/CDV.h>
#import "AppDelegate.h"

@interface AppDelegate (SFCMFixPlugin)
    
@end

@implementation AppDelegate(SFCMFixPlugin)

NSString *const MARKETING_CLOUD_PRIVACY_MODE_KEY = @"MarketingCloudSDK_PrivacyModeOverridden_1";
NSString *const MARKETING_CLOUD_PRIVACY_MODE_SUFFIX = @"MarketingCloudSDKPrivacy_SFMCPrivacyMode";

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary<UIApplicationLaunchOptionsKey,id> *)launchOptions{
    NSLog(@"------ AppDelegate+SFCMFix ----------");
    
    [self checkAndUpdateContactPushInfo];
    
    BOOL handled = [self application:application didFinishLaunchingWithOptions:launchOptions];
    
    return handled;
}

- (void)checkAndUpdateContactPushInfo {
    bool privacyModeIsNotOverridden = ![[NSUserDefaults standardUserDefaults] boolForKey: MARKETING_CLOUD_PRIVACY_MODE_KEY];
    
    if (privacyModeIsNotOverridden) {

        NSString* path = [[NSBundle mainBundle] pathForResource:@"config.xml" ofType:nil];
        NSData *data = [NSData dataWithContentsOfFile:path];
        NSString *xmlString = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        
        
        NSString *pattern = @"<preference name=\"com.salesforce.marketingcloud.app_id\" value=\"(.*?)\"";

        NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:pattern options:NSRegularExpressionDotMatchesLineSeparators error:nil];

        NSTextCheckingResult *match = [regex firstMatchInString:xmlString options:0 range:NSMakeRange(0, [xmlString length])];

        if (!match) {
            NSLog(@"Failed to get sfAppId");
            return [super application:application didFinishLaunchingWithOptions:launchOptions];
        }
        
        NSRange matchRange = [match rangeAtIndex:1];
        NSString *sfAppId = [xmlString substringWithRange:matchRange];
            
        [[NSUserDefaults standardUserDefaults] removeObjectForKey: [NSString stringWithFormat:@"%@_%@",sfAppId, MARKETING_CLOUD_PRIVACY_MODE_SUFFIX]];
        [[NSUserDefaults standardUserDefaults] setBool:true forKey:MARKETING_CLOUD_PRIVACY_MODE_KEY];
   }
}
@end
