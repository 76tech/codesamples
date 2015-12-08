package com.intellisante.c3healthlink.net;

import android.content.Context;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.toolbox.Volley;

/**
 * Created by snyderb on 7/16/15.
 */
public class C3VolleyQueue {
        private static C3VolleyQueue mInstance;
        private RequestQueue mRequestQueue;
        private static Context mCtx;

        private C3VolleyQueue(Context context) {
            mCtx = context;
            mRequestQueue = getRequestQueue();
        }

        public static synchronized C3VolleyQueue getInstance(Context context) {
            if (mInstance == null) {
                mInstance = new C3VolleyQueue(context);
            }
            return mInstance;
        }

        public RequestQueue getRequestQueue() {
            if (mRequestQueue == null) {
                // getApplicationContext() is key, it keeps you from leaking the
                // Activity or BroadcastReceiver if someone passes one in.
                mRequestQueue = Volley.newRequestQueue(mCtx.getApplicationContext());
            }
            return mRequestQueue;
        }

        public <T> void addToRequestQueue(Request<T> req) {
            getRequestQueue().add(req);
        }
}
