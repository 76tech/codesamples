package com.intellisante.c3healthlink.net;

import com.android.volley.NetworkResponse;
import com.android.volley.ParseError;
import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.toolbox.HttpHeaderParser;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.util.Map;

/**
 * Created by snyderb on 7/17/15.
 */
public class C3VolleyJsonRequest extends Request<JSONObject> {

    private static String TAG = C3VolleyJsonRequest.class.getName();

    private Response.Listener<JSONObject> listener;
    private Map<String, String> params;

    public C3VolleyJsonRequest(String url, Map<String, String> params,
                               Response.Listener<JSONObject> responseListener, Response.ErrorListener errorListener) {
        this(Method.POST, url, params, responseListener, errorListener);
    }

    public C3VolleyJsonRequest(int method, String url, Map<String, String> params,
                         Response.Listener<JSONObject> responseListener, Response.ErrorListener errorListener) {
        super(method, url, errorListener);
        this.listener = responseListener;
        this.params = params;
    }

    protected Map<String, String> getParams()
            throws com.android.volley.AuthFailureError {
        return params;
    };

    @Override
    protected Response<JSONObject> parseNetworkResponse(NetworkResponse response) {
        try {
            String jsonString = new String(response.data,
                    HttpHeaderParser.parseCharset(response.headers));
            return Response.success(new JSONObject(jsonString),
                    HttpHeaderParser.parseCacheHeaders(response));
        } catch (UnsupportedEncodingException e) {
            return Response.error(new ParseError(e));
        } catch (JSONException je) {
            return Response.error(new ParseError(je));
        }
    }

    @Override
    protected void deliverResponse(JSONObject response) {
        listener.onResponse(response);
    }
}