#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var et = require('elementtree');

module.exports = function (context) {  
  var platformRoot = path.join(context.opts.projectRoot, 'platforms/android/app/src/main');
  var mainActivityPath = path.join(platformRoot, 'java');

  var configXmlPath = path.join(context.opts.projectRoot, 'config.xml');
  var configData = fs.readFileSync(configXmlPath, 'utf8');
  var etree = et.parse(configData);
  var packageName = etree.getroot().attrib.id

  if (!packageName) {
    throw new Error('Unable to find package name in config.xml');
  }

  mainActivityPath = path.join(mainActivityPath, packageName.replace(/\./g, '/'), 'MainActivity.java');

  fs.readFile(mainActivityPath, 'utf8', function (err, data) {
    if (err) {
      throw new Error('Unable to read MainActivity.java: ' + err);
    }


    /**
     * UPDATE IMPORTS
     */
    var insertionPoint = 'import org.apache.cordova.*;';

    var index = data.indexOf(insertionPoint);
    if (index === -1) {
      throw new Error('Unable to find insertion point in MainActivity.java');
    }

    // Insert the code after the insertion point
    var modifiedData = data.slice(0, index + insertionPoint.length) + '\n' + codeToInjectImports + data.slice(index + insertionPoint.length);

    /**
     * UPDATE ONCREATE
     */
    
     // Find the end of the onCreate method
     var onCreateEndIndex = modifiedData.lastIndexOf('}');
     if (onCreateEndIndex === -1) {
       throw new Error('Unable to find the import section in MainActivity.java');
     }
     
    // Find the line with "super.onCreate(savedInstanceState);"
    var insertionPoint = 'super.onCreate(savedInstanceState);';
    var index = modifiedData.indexOf(insertionPoint);
    if (index === -1) {
      throw new Error('Unable to find insertion point in MainActivity.java');
    }
    // Insert the code after the insertion point
    modifiedData = modifiedData.slice(0, index + insertionPoint.length) + '\n' + codeToInjectInsideOnCreate + modifiedData.slice(index + insertionPoint.length);

    // Find the end of the onCreate method
    var onCreateEndIndex = modifiedData.lastIndexOf('}');
    if (onCreateEndIndex === -1) {
      throw new Error('Unable to find end of onCreate method in MainActivity.java');
    }

    /**
     * UPDATE CLASS TO ADD the checkAndUpdateContactPushInfo() CODE.
     */
    
    // Insert the code after the onCreate method
    modifiedData = modifiedData.slice(0, onCreateEndIndex) + '\n' + codeToInjectAfterOnCreate + modifiedData.slice(onCreateEndIndex);
    
    fs.writeFile(mainActivityPath, modifiedData, 'utf8', function (err) {
      if (err) {
        throw new Error('Unable to write to MainActivity.java: ' + err);
      }
      console.log('Code injected into MainActivity.java');
    });
  });
};


var codeToInjectImports = `
import android.content.SharedPreferences;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;
import android.content.Context;
`

var codeToInjectInsideOnCreate = '\t\tcheckAndUpdateContactPushInfo();\n';

var codeToInjectAfterOnCreate = `
    public void checkAndUpdateContactPushInfo () {
      final String MARKETING_CLOUD_PRIVACY_MODE_SUFFIX = "_SFMC_PrivacyMode";
      final String MARKETING_CLOUD_PRIVACY_MODE_KEY = "MarketingCloudSDK_PrivacyModeOverridden_1";
      final String MARKETING_CLOUD_PRIVACY_MODE_DATE_KEY = "MarketingCloudSDK_PrivacyMode_Date";

      SharedPreferences appSharedPreferences = getSharedPreferences(getPackageName(), Context.MODE_PRIVATE);
      boolean privacyModeIsNotOverridden = !appSharedPreferences.getBoolean(MARKETING_CLOUD_PRIVACY_MODE_KEY, false);

      if (privacyModeIsNotOverridden){
          String sfmcAppId = this.preferences.getString("com.salesforce.marketingcloud.app_id", "");
          if (sfmcAppId.isEmpty()){
              return;
          }

          //SF file exists?
          String fileName = sfmcAppId + MARKETING_CLOUD_PRIVACY_MODE_SUFFIX;
          File file = new File(getNoBackupFilesDir(), fileName);

          if (file.exists()){
              file.delete();
              appSharedPreferences.edit().putBoolean(MARKETING_CLOUD_PRIVACY_MODE_KEY, true).apply();
              appSharedPreferences.edit().putString(MARKETING_CLOUD_PRIVACY_MODE_DATE_KEY, getUtcDate()).apply();
              return;
          }
          //No file, search in shared preferences
          SharedPreferences sfmcSharedPreferences = getSharedPreferences(sfmcAppId + MARKETING_CLOUD_PRIVACY_MODE_SUFFIX, Context.MODE_PRIVATE);
          if (sfmcSharedPreferences.contains("cc_state")){
              sfmcSharedPreferences.edit().remove("cc_state").apply();
              appSharedPreferences.edit().putBoolean(MARKETING_CLOUD_PRIVACY_MODE_KEY, true).apply();
              appSharedPreferences.edit().putString(MARKETING_CLOUD_PRIVACY_MODE_DATE_KEY, getUtcDate()).apply();
              return;
          }
      }
    }
    
    String getUtcDate(){
      Date currentDate = new Date();
      // Define the desired date format
      SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
      dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

      // Format the date
      String formattedDate = dateFormat.format(currentDate);

      return formattedDate;
    }
    `;