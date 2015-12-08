package com.intellisante.c3healthlink.net;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.preference.PreferenceManager;
import android.util.Log;

import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.params.HttpConnectionParams;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class C3ApiNet {

    private static final String TAG = "C3ApiNet";
    private static String TAG = C3ApiNet.class.getName();
    private Context context;
    private String deviceId;
    private String authToken;
    private String c3domain;
    private String c3path;
    private Map<String, String> volleyParams;

    public C3ApiNet(Context context) {
        this.context = context;

        deviceId = PreferenceManager.getDefaultSharedPreferences(context)
                .getString("deviceId", null);

        authToken = PreferenceManager.getDefaultSharedPreferences(context)
                .getString("authToken", null);
        c3domain = PreferenceManager.getDefaultSharedPreferences(context)
                .getString("C3API_DOMAIN", null);
        c3path = PreferenceManager.getDefaultSharedPreferences(context)
                .getString("C3API_PATH", null);

        c3apiurl = c3domain + "/" + c3path;

        volleyParams = new HashMap<String, String>();
    }

    public String getc3apiurl() {
        return this.c3apiurl;
    }

    public void putVolleyParam(String key, String val) {
        this.volleyParams.put(key, val);
    }

    public void setVolleyAuthToken() {
        this.volleyParams.put("authToken", authToken);
    }

    public void setVolleyDeviceId() {
        this.volleyParams.put("deviceId", deviceId);
    }

    public void setVolleyDefaultParams() {
        this.setVolleyDeviceId();
        this.setVolleyAuthToken();
    }
    public Map<String, String> getVolleyParams() {
        return this.volleyParams;
    }

    public boolean networkingEnabled() {
        ConnectivityManager connectivityMgr = (ConnectivityManager) context
                .getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo wifi = connectivityMgr.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
        NetworkInfo mobile = connectivityMgr.getNetworkInfo(ConnectivityManager.TYPE_MOBILE);

        if ( wifi != null && wifi.isConnected() ) {
            return true;
        }
        if (mobile != null && mobile.isConnected()) {
            return true;
        }

        Log.i("warning", "Error checking internet connection");
        return false;
    }
}
