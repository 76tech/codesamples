package com.intellisante.c3healthlink.fragment;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.support.v4.app.Fragment;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.intellisante.c3healthlink.MedResponderActivity;
import com.intellisante.c3healthlink.R;
import com.intellisante.c3healthlink.SurveyActivity;
import com.intellisante.c3healthlink.extensions.OnClickWithDashParams;
import com.intellisante.c3healthlink.net.C3ApiNet;
import com.intellisante.c3healthlink.net.C3VolleyJsonRequest;
import com.intellisante.c3healthlink.net.C3VolleyQueue;
import com.intellisante.c3healthlink.net.DashFetcher;
import com.intellisante.c3healthlink.objects.DashItem;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;

public class DashFragment extends Fragment {

    private static final String TAG = "DashFragment";

    ListView dashListView;
    ArrayList<DashItem> dashItems;
    Context context;
    View v;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRetainInstance(true);

        context = getActivity();

        setHasOptionsMenu(false);

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup parent,
                             Bundle savedInstanceState) {
        v = inflater.inflate(R.layout.fragment_dash, parent, false);
        dashListView = (ListView) v.findViewById(R.id.dash_list_view);

        return v;
    }

    @Override
    public void onResume() {
        super.onResume();

        fetchItems();

    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
    }

    private void fetchItems() {

        C3ApiNet c3net = new C3ApiNet(context);

        boolean netEnabled = c3net.networkingEnabled();
        PreferenceManager.getDefaultSharedPreferences(context).edit()
                .putBoolean("NETWORKING_ENABLED", netEnabled)
                .commit();
        if (netEnabled == false) {
            return;
        }

        c3net.setVolleyDefaultParams();
        c3net.putVolleyParam("command", "getExpressDash");

        //create string req
        C3VolleyJsonRequest jsonReq = new C3VolleyJsonRequest(
                c3net.getc3apiurl(),
                c3net.getVolleyParams(),
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        volleyFetchSuccess(response);
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError err) {
                        volleyFetchError(err);
                    }
                }
        );

        C3VolleyQueue.getInstance(context).addToRequestQueue(jsonReq);
    }

    private void volleyFetchSuccess(JSONObject resp) {

        ArrayList<DashItem> items = new ArrayList<DashItem>();

        if (resp == null) {
            Toast.makeText(context, "It appears you are offline.  Please try again later.", Toast.LENGTH_LONG)
                    .show();
            return;
        }
        try {
            Log.d(TAG, resp.toString());
            JSONArray entries = resp.getJSONArray("dashboard");
            for (int i = 0; i < entries.length(); i++) {
                JSONObject o = entries.getJSONObject(i);
                items.add(new DashItem(o));
            }

        } catch (JSONException e) {
            Log.d(TAG, e.toString());
        }

        Collections.sort(items);
        dashItems = items;
        setupAdapter();
    }

    private void volleyFetchError(VolleyError err) {
        Log.d(TAG, err.getMessage());
        Toast.makeText(context, "It appears you are offline.  Please try again later.", Toast.LENGTH_LONG)
                .show();
    }

    void setupAdapter() {
        if (getActivity() == null || dashListView == null) return;

        if (dashItems != null) {
            dashListView.setAdapter(new DashItemAdapter(dashItems, context));
        } else {
            dashListView.setAdapter(null);
        }
    }

    private void getMedResponder(Context context, DashItem item) {
        Intent medResponder = new Intent(getActivity(), MedResponderActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .setFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                .setFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);
        medResponder.putExtra("due", item.getCellSubtext());
        medResponder.putExtra("med", item.getCellTitle());
        medResponder.putExtra("umid", item.getUmid());
        medResponder.putExtra("eid", item.getEid());
        medResponder.putExtra("compliance", item.getCompliance());
        medResponder.putExtra("history", item.getMedHistory());
        medResponder.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(medResponder);
    }

    private void getSurvey(Context context, DashItem item) {
        Intent survey = new Intent(getActivity(), SurveyActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .setFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                .setFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);
        survey.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        survey.putExtra("eid", item.getEid());
        survey.putExtra("sid", item.getSid());
        startActivity(survey);
    }

    private void activateLink(Context context, DashItem item) {
        String link = item.getLink();
        if (link != "") {
            Log.d("LINK", link);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(link));
            startActivity(i);
        }
    }

    private class DashItemAdapter extends ArrayAdapter<DashItem> {
        private Context context;

        public DashItemAdapter(ArrayList<DashItem> items, Context context) {
            super(getActivity(), 0, items);
            this.context = context;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = getActivity().getLayoutInflater()
                        .inflate(R.layout.dash_item, parent, false);
            }

            DashItem item = getItem(position);

            ImageView itemAlert = (ImageView) convertView
                    .findViewById(R.id.dash_item_alert);


            TextView bigText = (TextView) convertView
                    .findViewById(R.id.dash_text_big_text);

            LinearLayout hideable = (LinearLayout) convertView
                    .findViewById(R.id.dash_item_hideable);

            TextView textTitle = (TextView) convertView
                    .findViewById(R.id.dash_text_title);

            TextView subtext = (TextView) convertView
                    .findViewById(R.id.dash_text_subtext);

            ImageView action = (ImageView) convertView
                    .findViewById(R.id.dash_item_action);

            LinearLayout actionCell = (LinearLayout) convertView
                    .findViewById(R.id.dash_item_action_cell);

            itemAlert.setImageResource(getResources()
                    .getIdentifier(item.getCellImage(),
                            "drawable", "com.intellisante.c3healthlink"));
            bigText.setText(item.getBigText());
            textTitle.setText(item.getCellTitle());
            subtext.setText(item.getCellSubtext());
            action.setImageResource(getResources()
                    .getIdentifier(item.getCellActionButton(),
                            "drawable", "com.intellisante.c3healthlink"));


            if (item.getType().equalsIgnoreCase("med")) {
                actionCell.setOnClickListener(new OnClickWithDashParams(context, item) {
                    @Override
                    public void onClick(View v) {
                        getMedResponder(this.context, this.item);
                    }
                });
            } else if (item.getType().equalsIgnoreCase("surv")) {
                actionCell.setOnClickListener(new OnClickWithDashParams(context, item) {
                    @Override
                    public void onClick(View v) {
                        getSurvey(this.context, this.item);
                    }
                });
            } else if (item.getType().equalsIgnoreCase("alert")) {
                actionCell.setOnClickListener(new OnClickWithDashParams(context, item) {
                    @Override
                    public void onClick(View v) {
                        activateLink(this.context, this.item);
                    }
                });
            }

            if (item.showBigText()) {
                hideable.setVisibility(View.INVISIBLE);
                bigText.setVisibility(View.VISIBLE);
            } else {
                hideable.setVisibility(View.VISIBLE);
                bigText.setVisibility(View.INVISIBLE);
            }


            return convertView;
        }
    }
}
