<?php
ob_start();
//load primary libraries and error control
require_once("../../../psy_lib/lib/psyMasterLib.inc.php");

$user=new userLib();

if ($user->error) {
    $resp["error"]="Sorry but I'm getting a system error. You'll need to try again later: ".__LINE__;
    if (strlen($user->redir) > 4) $resp["redir"] = $user->redir;
    echo to_json($resp);
} else {
    
    if ($_REQUEST["oauthtoken"])
        $oauthToken = $_REQUEST['oauthtoken'];
    if ($_REQUEST["verifiertoken"])
        $verifierToken = $_REQUEST['verifiertoken'];
    
    if ($_REQUEST["parse"]) {
        $parse = $_REQUEST['parse'];
        
        switch (true) {
            
        case ($parse=="fitbitauth"):
            $fitbit = new Fitbit();
            
            if ( $fitbit->fetchAuthToken() ) {
                // we have the auth token.  user is already linked
                $userMsg = "Your Fitbit and C3HealthLink accounts have already been linked.";
            }
            elseif ( $fitbit->fetchReqToken() ) {
                
                if ( $fitbit->getAuthToken($oauthToken) === true )
                    $userMsg = "Congratulations, you have successfully linked your Fitbit and C3HealthLink accounts.";
                else 
                    $resp["url"] = $fitbit->getReqTokenURL();
            }
            else {
                $resp["url"] = $fitbit->getReqTokenURL();
                $userMsg = ''; //No message needed - it redirects to Fitbit, then back to here as a callback.
            }
            
            $resp["content"] = $userMsg;
            echo to_json($resp);
            break;
            
        } //es
    } //end parse check
}

class DevicesView {
    
} //ec



?>