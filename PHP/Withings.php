<?php

require_once("{$config["sysroot"]}/lib/WithingsOAuth.php");

class Withings {
    
    function __construct($id=false, $withings_id=false) {
        
        global $user, $config;
        dbConnect();
        
        if ( $id != false && $withings_id == true) {
            $sql = "SELECT uRec FROM deviceAuth WHERE device=" . WITHINGS . " AND userId='" . $id . "'";
            if ($rc=dbQuery($sql))  {
                if ($row=dbFetch($rc)) {
                    $this->uRec=$row['uRec'];
                    $this->user=new User($row['uRec']);
                    $this->user->getUser($row['uRec']);
                }
                else {
                    logit(WARN, " Not a Withings id in ".__FILE__." on line: ".__LINE__);
                    return false;
                }
            }
            else {
                logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
                return false;
            }
        } elseif (is_uRec($id)) {
            $this->uRec=$id;
            $this->user=new User($id);
            $this->user->getUser($id);
        } elseif (is_uRec($user->uRec)) {
            $this->uRec=$user->uRec;
            $this->user=$user;
        }
        else {
            return false;
        }
        
        $this->reqToken = $this->reqSecret = $this->oauthToken = 
            $this->oauthVerifier = $this->userid = null;
        
        // Withings config
        $this->key = $config['withingsKey'];
        $this->secretKey = $config['withingsSecretKey'];
        $this->c3url = $config['url'];
        $this->device = WITHINGS;    
        $this->hmac_method = new OAuthSignatureMethod_HMAC_SHA1();
        $this->sig_method = $this->hmac_method;
        
        $this->callback_url = $config["url"] . "/user/withingsLinkAuth.php";
        $this->oauth_url = "https://oauth.withings.com/account/";
        $this->req_url = $this->oauth_url . 'request_token';
        $this->auth_url = $this->oauth_url . 'authorize';
        $this->acc_url = $this->oauth_url . 'access_token';
        
        $this->base_url = "http://wbsapi.withings.net/measure?action=getmeas";
        $this->notify_url = "http://wbsapi.withings.net/notify?action=";
        
        $this->subscription_url = urlencode($config["url"] . "/api/devices/withings.php");
        
        $this->consumer = new OAuthConsumer($this->key, $this->secretKey, $this->callback_url);
        
        // Withings data type definitions
        $this->weight = 1;
        $this->systolic_bp = 10;
        $this->diastolic_bp = 9;
        $this->pulse = 11;
        
        $this->fetchAllTokens();
        
        $this->providerLink = false;
        $this->caregiverLink = false;
        $this->fetchPermissions();
        
    }
    
    function fetchAllTokens() {
        
        dbConnect();
        
        $sql = "SELECT reqToken, reqSecret, authToken, authSecret, oauthToken, oauthVerifier, userId FROM deviceAuth WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                $this->reqToken = $row["reqToken"];
                $this->reqSecret = $row["reqSecret"];
                $this->authToken = $row["authToken"];
                $this->authSecret = $row["authSecret"];
                $this->oauthToken = $row["oauthToken"];
                $this->oauthVerifier = $row["oauthVerifier"];
                $this->userId = $row["userId"];
            }
            else {
                return false;
            }
        } 
        else {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        return true;
    }
    
    function setPermissions($userType, $setting) {
        
        dbConnect();
        $in = array();
        $err = true;
        
        if ( $userType == PROVIDER ) {
            $in['providerLink'] = $setting;
        }
        elseif ( $userType == CAREGIVER ) {
            $in['caregiverLink'] = $setting;
        }
        else {
            $err = "Sorry, there was a system error. Please try again later.";
            logit(WARN, "Error in ".__FILE__." on line: ".__LINE__);
            return;
        }
        $sql = "UPDATE deviceAuth " . makeSql($in, "update") . " WHERE device={$this->device} AND uRec='{$this->uRec}'";
        if ($rc=dbQuery($sql)) {
        } else {
            $err = "Sorry, there was a system error. Please try again later.";
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        return $err;
    }
    
    function fetchPermissions() {
        
        dbConnect();
        
        $sql = "SELECT providerLink, caregiverLink FROM deviceAuth WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                $this->providerLink = $row["providerLink"];
                $this->caregiverLink = $row["caregiverLink"];
            }
            else {
                return false;
            }
        } 
        else {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        return true;
    }
    
    function getAuthStatusHTML() {
        if ( $this->authToken != null ) {
            // we have the auth token.  user is already linked
            $str .= "Your Withings and C3HealthLink accounts have already been linked. <br /> ";
            $str .=  $this->getUnlinkForm();
            $str .=  $this->getProviderLinkForm();
        }
        elseif ( $this->reqToken != null ) {
            if ( $this->getAuthToken() === true ) {
                $this->getStatsByDate();
                $this->saveStats();
                $str .= "Congratulations, you have successfully linked your Withings and C3HealthLink accounts.<br /><br />";
                $str .=  $this->getUnlinkForm();
                $str .=  $this->getProviderLinkForm();
            }
            else  {
                $str .= "<a href='{$this->getReqTokenURL()}' target='_withings'>Authorize Withings Data Link</a> (opens in a new window)<br /><br /><br />";
            }
        }
        else {
            $str .= "<a href='{$this->getReqTokenURL()}' target='_withings'>Authorize Withings Data Link</a> (opens in a new window)<br /><br /><br />";
        }
        
        return $str;
    }
    
    function getProviderLinkForm() {
        $checkedProv = $this->providerLink ? "checked" : '';
        $checkedCg = $this->caregiverLink ? "checked" : '';
        
        $str = "<br /><br />
            <table>
               <tr>
                  <td>Allow access to your Withings data?</td>
                  <td><input type='checkbox' name='withingsProviderLink' data-device='".WITHINGS."' data-usertype='".PROVIDER."' {$checkedProv}>Providers<br />
                      <input type='checkbox' name='withingsCaregiverLink' data-device='".WITHINGS."' data-usertype='".CAREGIVER."' {$checkedCg}>Caregivers</td>
               </tr>
            </table>
<br /><br />";
            return $str;
    }
    
    
    function getUnlinkForm() {
        $str = '';
        $str .= "    		<form id='withingsUnlinkForm' method='POST'>
                <div>
                    <div class='floatLeft' style='width:49%'>
						<img src='/images/loader.gif' id='withingsLoaderGif' title='' border=0 alt='' style='display: none;'>
                        <input type='submit' value='Unlink' class='submit1 divClick' id='unlinkWithings' />&nbsp;<br>
                    </div>
                    <div class='floatRight' style='width:51%;'>
                        <div id='withingsStatusDiv' style=''></div>
                    </div>
                </div>
            </form>";
        
        return $str;
    }
    
    function getReqTokenURL() {
        $req_req = OAuthRequest::from_consumer_and_token($this->consumer, NULL, "GET", $this->req_url . "?oauth_callback=".urlencode($this->callback_url));
        $req_req->sign_request($this->sig_method, $this->consumer, NULL);
        
        $response = file_get_contents($req_req);
        if ( $response === FALSE ) {
            return false;
        }
        parse_str ($response,$request_token_info);
        
        $this->reqToken = new OAuthToken($request_token_info["oauth_token"], $request_token_info["oauth_token_secret"]);
        $this->saveReqToken($request_token_info['oauth_token'], $request_token_info['oauth_token_secret']);
        $auth_req = OAuthRequest::from_consumer_and_token($this->consumer, $this->reqToken, "GET", $this->auth_url);
        $auth_req->sign_request($this->sig_method, $this->consumer, $this->reqToken);
        return $auth_req;
    }  
    
    function saveReqToken($token, $secret) {
        dbConnect();
        
        $in['uRec'] = $this->user->uRec;
        $in['reqToken'] = dbRealEscapeString($token);
        $in['reqSecret'] = dbRealEscapeString($secret);
        $in['c3url'] = $this->c3url;
        $in['device'] = $this->device;
        
        $sql = "SELECT * FROM deviceAuth WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        if (!$rc=dbQuery($sql))  {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        $rowCount = dbNumRows($rc);
        if ( $rowCount == 1 ) {
            $sql = "UPDATE deviceAuth " . makeSql($in, "update") . " WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        }
        elseif ( $rowCount == 0 ) {
            $sql = "INSERT INTO deviceAuth ".makeSql($in, "insert");      
        }
        else {
            logit(INFO, " Withings error: Multiple entries in ".__FILE__." on line: ".__LINE__);
        }
        
        if(!$rc=dbQuery($sql)) {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
    } //ef
    
    function fetchReqToken() {
        
        dbConnect();
        
        $sql = "SELECT reqToken, reqSecret FROM deviceAuth WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                $this->reqToken = $row["reqToken"];
                $this->reqSecret = $row["reqSecret"];
            }
            else {
                return false;
            }
        } 
        else {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        if ( $this->reqToken == null || $this->reqToken == '' ||
        $this->reqSecret == null || $this->reqSecret == '' )
            return false;
        
        return true;
    } //ef
    
    function getAuthToken() {
        // get oauth token from db 
        if ( $this->oauthToken == null || $this->oauthVerifier == null || $this->userId == null )
            return false;
        $newReqToken = new OAuthToken($this->reqToken, $this->reqSecret);
        
        $acc_req = OAuthRequest::from_consumer_and_token($this->consumer, $newReqToken, "GET", $this->acc_url. "?userid=".$this->userId);
        
        $acc_req->sign_request($this->sig_method, $this->consumer, $newReqToken);
        
        //Send the request
        $context = stream_context_create(array(
            'http' => array(
                'ignore_errors' => true
            )
        ));
        $response = file_get_contents($acc_req, FALSE, $context);
        if ( $response === FALSE || $response == null || $response == '' ) {
            return false;
        }
        
        parse_str ($response,$access_token_info);
        
        $this->saveAuthToken($access_token_info['oauth_token'], $access_token_info['oauth_token_secret']);
        $this->fetchAllTokens();
        $this->registerSubscription();
        
        return true;
    }  
    
    function saveAuthToken($token, $secret) {
        dbConnect();
        
        $in['authToken'] = dbRealEscapeString($token);
        $in['authSecret'] = dbRealEscapeString($secret);
        
        $sql = "UPDATE deviceAuth " . makeSql($in, "update") . " WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        if(!$rc=dbQuery($sql)) {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
    } //ef
    
    function saveOauthTokens($token, $verifier, $userid) {
        dbConnect();
        
        $this->oauth_verifier = dbRealEscapeString($verifier);
        $this->oauth_token = dbRealEscapeString($token);
        $this->userid = $userid;
        
        $in['oauthToken'] = $token;
        $in['oauthVerifier'] = $verifier;
        $in['userId'] = $userid;
        
        $sql = "UPDATE deviceAuth " . makeSql($in, "update") . " WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        
        if(!$rc=dbQuery($sql)) {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
    } //ef
    
    function fetchAuthToken() {
        dbConnect();
        
        $sql = "SELECT authToken, authSecret FROM deviceAuth WHERE device={$this->device} AND c3url='{$this->c3url}' AND uRec='{$this->uRec}'";
        
        if ($rc=dbQuery($sql)) {
            if ( $row=dbFetch($rc) ) {
                $this->authToken = $row["authToken"];
                $this->authSecret = $row["authSecret"];
            }
            else {
                return false;
            }
        } 
        else {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        if ( $this->authToken == null || $this->authToken == '' ||
        $this->authSecret == null || $this->authSecret == '' ) {
            return false;
        }
        return true;
    } //ef
    
    function getYesterdaysStats() {
        $end=strtotime("today midnight");  
        $start=strtotime("yesterday midnight");  
        return $this->getStatsByDate($start, $end);
    }
    
    function handleSubscription($mode=null) {
        
        if ( $mode == null )
            return false;
        
        $comment = null;
        if ($mode == 'register') {
            $action = "subscribe";
            $comment = "&comment="."C3HealthLink Device Link Authorization";
        }
        elseif ( $mode == 'list' ) {
            $action = "list";
        }
        elseif ( $mode == 'check' ) {
            $action = "get";
        }
        elseif ( $mode == 'unregister' ) {
            $action = "revoke";
        }
        else {
            return false;
        }
        
        $acc_tok = new OAuthToken($this->authToken, $this->authSecret);
        $req = OAuthRequest::from_consumer_and_token($this->consumer, $acc_tok, "GET", 
        $this->notify_url . 
        $action .
        "&userid=".$this->userId . 
        "&callbackurl=".$this->subscription_url.
        $comment);
        
        $req->sign_request($this->sig_method, $this->consumer, $acc_tok);
        
        $response = file_get_contents($req, FALSE, $this->context);
        if ( $response === FALSE || $response == null || $response == '' ) {
            logit(INFO, "No response in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        
        $response_array = json_decode($response);
        return $response_array;
    }
    
    function registerSubscription() {
        if ( $this->checkSubscription() ) {
            logit(INFO, $this->uRec . " Already subscribed to Withings");
            return true;
        }
        $response_array = $this->handleSubscription("register");
        
        if ( $response_array->status != 0 ) {
            logit(INFO, "Withings data error: status code " . $response_array->status . " in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        
        return true;
        
    }
    
    function listSubscriptions() {
        $reponse_array =  $this->handleSubscription("list");
        if ( $response_array->status != 0 ) {
            logit(INFO, "Withings data error: status code " . $response_array->status . " in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        return true;
    }
    
    function checkSubscription() {
        $response_array =  $this->handleSubscription("check");
        
        if ( $response_array->status == 343 ) {
            logit(INFO, "Withings data - no callback registered in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        if ( $response_array->status != 0 ) {
            logit(INFO, "Withings data error: status code " . $response_array->status . " in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        return true;
    }
    
    function unregisterSubscription() {
        $response_array = $this->handleSubscription("unregister");
        if ( $response_array->status == 294 ) {
            logit(INFO, "Withings data: no subscription to delete in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        if ( $response_array->status != 0 ) {
            logit(INFO, "Withings data error: status code " . $response_array->status . " in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        return true;
    }
    
    function getStatsByDate($start=null, $end=null) {
        
        $this->stats = array();
        
        $date_limit = '';
        
        if ( $end != null ) {
            $date_limit .= "&enddate=".$end;
        }
        if ( $start != null ) {
            $date_limit .= "&startdate=".$start;
        }
        
        $acc_tok = new OAuthToken($this->authToken, $this->authSecret);
        $req = OAuthRequest::from_consumer_and_token($this->consumer, $acc_tok, "GET", 
        $this->base_url . 
        $date_limit .
        "&userid=".$this->userId);
        
        $req->sign_request($this->sig_method, $this->consumer, $acc_tok);
        
        $response = file_get_contents($req, FALSE, $this->context);
        if ( $response === FALSE || $response == null || $response == '' ) {
            return false;
        }
        
        $response_array = json_decode($response);
        
        if ( $response_array->status != 0 ) {
            logit(INFO, "Withings data error: status code " . $response_array->status);
            return false;
        }
        
        foreach ( $response_array->body->measuregrps as $entry_group ) {
            // continue if category is 2 - these are targets, not measurements.
            if ( $entry_group->category == 2 )
                continue;
            
            $date = $entry_group->date;
            
            foreach ( $entry_group->measures as $entry ) {
                $value = $entry->value;
                $type = $entry->type;
                if ( $entry->unit != 0 )
                    $value = $value * pow(10, $entry->unit);
                // convert kilograms to pounds
                if ( $type == $this->weight ) {
                    $value *= 2.20462;
                }
                $value = round($value,2);
                $short_entry = new StdClass();
                $short_entry->date = dbDate($date);
                $short_entry->datetime = dbDateTime($date);
                $short_entry->metric = $type;
                $short_entry->value = $value;
                $this->stats[] = $short_entry;
            }
        }
        
        return $this->stats;
    }
    
    function saveStats() {
        foreach ( $this->stats as $entry ) {
            $in = array();
            $in['uRec'] = $this->user->uRec;
            $in['device'] = $this->device;
            $in['date'] = $entry->date;
            $in['metric'] = $entry->metric;
            $in['value'] = $entry->value;
            
            //check
            $sql="SELECT * FROM deviceData WHERE device={$this->device} AND date='". $in["date"] . 
                "' AND uRec='{$this->uRec}'" .
                " AND metric=".$in['metric'];
            
            $id = 0;
            if ($rc=dbQuery($sql)) {
                if ($row=dbFetch($rc)) {
                    $id = $row["id"];
                    $update=true; 
                }
                else 
                    $update=false;
            } 
            else 
                logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
            
            if ($update) 
                $sql="UPDATE deviceData ".makeSql($in,"update")." WHERE id=$id ";
            else $sql="INSERT INTO deviceData ".makeSql($in,"insert");
            
            if (!dbQuery($sql)) {
                logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
                return false;
            }
        }
        return true;
    }
    
	function metricTally($metric=null) {
		/*	
			Returns number of records for this user's metric for this user.
		*/
		if ( $metric == null ) {
			return null;
		}
		$sql="SELECT COUNT(id) as numRows FROM deviceData WHERE device={$this->device} AND uRec='{$this->uRec}' AND metric=".$metric;
		if ($rc=dbQuery($sql)) {
			$data=dbFetch($rc);
			return $data["numRows"];
		}else{
			logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
		}	
	}
    
	function fetchSingleMetric($metric=null, $start=null, $end=null, $nullPad=false) {
        
        if ( $metric == null ) {
            return null;
        }
        //default to last 30 days
        if (!$end) $end=dbDate();
        if (!$start) $start=dbDate(strtotime("-30 days"));
        
        $sql="SELECT * FROM deviceData WHERE device={$this->device} AND uRec='{$this->uRec}' AND metric=".$metric;
        
        if ( $start != null ) {
            $sql .= " AND date >= '" . $start . "'";
        }
        if ( $end != null ) {
            $sql .= " AND date <= '" . $end . "'";
        }
        $sql .= " ORDER BY date ASC";
        
        $out = array();
        $datesRecorded = array();
        
        if ($rc=dbQuery($sql)) {
            while ($row=dbFetch($rc)) {
                $out[] = array('date'=>$row['date'], 'value'=>$row['value']);
                $datesRecorded[] = $row['date'];
            }
        } 
        else {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        if ( count($out) == 0 ) {
            return $out;
        }
        
        if ( $nullPad == true ) {
            if ( strtotime($start) < strtotime("-1 years") ) {
                $seriesBegin = new DateTime($out[0]['date']);
            }
            else {
                $seriesBegin = new DateTime($start);
            }
            $seriesEnd = new DateTime($end);
            $interval = DateInterval::createFromDateString('1 day');
            $period = new DatePeriod($seriesBegin, $interval, $seriesEnd);
            foreach ( $period as $dt ) {
                $date = $dt->format("Y-m-d");
                if ( !in_array($date, $datesRecorded) ) {
                    $out[] = array('date'=>$date, null);
                }
                
            }
            usort($out, function ( array $a, array $b ) {
                return strtotime($a["date"]) - strtotime($b["date"]); 
            });
        }
        
        return $out;
        
	}
    
    function fetchWeight($start=null, $end=null, $nullPad=false) {
        return $this->fetchSingleMetric($this->weight, $start, $end, $nullPad);
    }
    
    function fetchPulse($start=null, $end=null, $nullPad=false) {
        return $this->fetchSingleMetric($this->pulse, $start, $end, $nullPad);
    }
    
    function fetchBloodPressure($start=null, $end=null, $nullPad=false) {
        
        $sql="SELECT * FROM deviceData WHERE device={$this->device} AND uRec='{$this->uRec}' ".
            "AND ( metric=".$this->systolic_bp . " OR metric=".$this->diastolic_bp.")";
        
        //default to last 30 days
        if (!$end) $end=dbDate();
        if (!$start) $start=dbDate(strtotime("-30 days"));
        
        if ( $start != null ) {
            $sql .= " AND date >= '" . $start . "'";
        }
        if ( $end != null ) {
            $sql .= " AND date <= '" . $end . "'";
        }
        $sql .= " ORDER BY date ASC";
        
        $data = array();
        if ($rc=dbQuery($sql)) {
            while ($row=dbFetch($rc)) {
                if ( $row['metric'] == $this->diastolic_bp ) {
                    $data[$row['date']]['dia'] = $row['value'];
                }
                elseif ( $row['metric'] == $this->systolic_bp ) {
                    $data[$row['date']]['sys'] = $row['value'];
                }
            }
        } 
        else {
            logit(WARN, " DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        $out = array();
        $datesRecorded = array();
        foreach ( $data as $date => $vals ) {
            $out[] = array('date'=>$date, 'sys' => $vals['sys'], 'dia' => $vals['dia']);
            $datesRecorded[] = $date;
        }
        
        if ( $nullPad == true ) {
            if ( strtotime($start) < strtotime("-1 years") ) {
                $seriesBegin = new DateTime($out[0]['date']);
            }
            else {
                $seriesBegin = new DateTime($start);
            }
            $seriesEnd = new DateTime($end);
            $interval = DateInterval::createFromDateString('1 day');
            $period = new DatePeriod($seriesBegin, $interval, $seriesEnd);
            foreach ( $period as $dt ) {
                $date = $dt->format("Y-m-d");
                if ( !in_array($date, $datesRecorded) ) {
                    $out[] = array('date'=>$date, 'sys' => null, 'dia' => null);
                }
                
            }
            usort($out, function ( array $a, array $b ) {
                return strtotime($a["date"]) - strtotime($b["date"]); 
            });
        }
        
        
        return $out;
        
    }
} //ec


?>