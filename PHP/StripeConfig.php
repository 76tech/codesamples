<?php

class StripeConfig {
    
    // $err object as returned by some functions is laid out like so:
    // $err['code'] = error code.  ex. "expired_card", "missing".  "OK" is returned on success
    // $err['message'] is the human readable message returned by stripe
    
    function __construct($uRec=false) {
        global $stripeConfig;
        
        $this->setUser($uRec);
        
        $this->secretKey = $this->pubKey = null;
        $this->secretKey = $stripeConfig['secretKey'];
        $this->pubKey = $stripeConfig['pubKey'];
        $this->card = null;
        $this->email = null;
        $this->stripeId = null;
        $this->couponCode = null;
        $this->percent_off = null;//percent off( 20 == 20% off)
        $this->amount = null;// in cents (1000 = $10.00)
        
    } //ef construct
    
    //-------------------------------------------------------------------------------------------
    function setUser($uRec) {
        
        global $user, $stripeConfig;
        
        if (is_uRec($uRec)) {
            $this->uRec=$uRec;
            $this->user=new User($uRec);
            $this->user->getUser($uRec);
            return true;
            
        } elseif (is_uRec($user->uRec)) {
            $this->uRec=$user->uRec;
            $this->user=$user;
            return true;
        }
        
        return false;
        
    }
    //-------------------------------------------------------------------------------------------
    
    function init() {
        Stripe::setApiKey($this->secretKey);
    } //ef init
    
    //-------------------------------------------------------------------------------------------
    
    function getCustomer() {
        $sql = "SELECT card, stripeId, email FROM stripeAuth WHERE uRec=" . $this->uRec;
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                $this->stripeId = $row["stripeId"];
                $this->card = $row["card"];
                $this->email = psyDecrypt($row["email"]);
            }
        }
        else {
            logit(WARN, " DB Error: $sql in ".__FILE__." on line: ".__LINE__);
        }
        return false;
    } 
    
    //-------------------------------------------------------------------------------------------
    function getCardInfo() {
        /* fetch stripes card information for this person as array */
        $stripeCardData = array();
        $stripeCardData["type"] = "";
        $stripeCardData["last4"] = "";
        $stripeCardData["expiration"] = "";
        $stripeCardData["coupon"] = "";
        
        $sql = "SELECT coupon FROM users WHERE uRec=" . $this->uRec;
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                $stripeCardData["coupon"] = $row["coupon"];
            }
        }
        else {
            logit(WARN, " DB Error: $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        
        if ( $this->stripeId == null ) 
            return $stripeCardData;
        
        $cu = Stripe_Customer::retrieve($this->stripeId);
        
        if($cu->deleted == 1){
            $stripeCardData["type"] = "";
            $stripeCardData["last4"] = "";
            $stripeCardData["expiration"] = "";
            $stripeCardData["coupon"] = "";
            $stripeCardData["deleted"] = true; 
        }else{
            if ( $stripeCardData != "" && $stripeCardData != $cu->discount->coupon->id )
                logit(WARN, "Stripe coupon discrepancy: " . $stripeCardData["coupon"] . " vs " . $cu->discount->coupon->id);
            $stripeCardData["type"] = $cu->cards->data[0]->type;
            $stripeCardData["last4"] = $cu->cards->data[0]->last4;
            $stripeCardData["expiration"] = "{$cu->cards->data[0]->exp_month}/{$cu->cards->data[0]->exp_year}";
            $stripeCardData["coupon"] = $cu->discount->coupon->id;
        }
        return $stripeCardData;
    }
    
    //-------------------------------------------------------------------------------------------
    function verifyCoupon($coupon=null) {
        //    global $config;
        
        $discount = $this->getCouponPercentOff($coupon);
        if ( $discount != null ) {
            return true;
        }
        else {
            return false;
        }
    }
    //-------------------------------------------------------------------------------------------
    function getCouponPercentOff($coupon=null) {
        $resp['code'] = '';
        $resp['message'] = '';
        
        try {
            $resp = Stripe_Coupon::retrieve($coupon);
            return $resp->percent_off;
            
            $resp['code'] = 'OK';
            $resp['message'] = $resp->percent_off;
            return $resp;
            
        }  catch(Stripe_CardError $e) {
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_InvalidRequestError $e) {
            // Invalid parameters were supplied to Stripe's API
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_AuthenticationError $e) {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_ApiConnectionError $e) {
            // Network communication with Stripe failed
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_Error $e) {
            // Display a very generic error to the user, and maybe send
            // yourself an email
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Exception $e) {
            // Something else happened, completely unrelated to Stripe
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        }
        
        // if nothing is returned above, return null.  should never happen.
        return null;
    }
    //-------------------------------------------------------------------------------------------
    function getCouponInfo($coupon=null) {
        $resp['code'] = '';
        $resp['message'] = '';
        
        try {
            $resp = Stripe_Coupon::retrieve($coupon);
            return $resp;
            
            $resp['code'] = 'OK';
            $resp['message'] = $resp->percent_off;
            return $resp;
            
        }  catch(Stripe_CardError $e) {
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_InvalidRequestError $e) {
            // Invalid parameters were supplied to Stripe's API
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_AuthenticationError $e) {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_ApiConnectionError $e) {
            // Network communication with Stripe failed
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_Error $e) {
            // Display a very generic error to the user, and maybe send
            // yourself an email
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Exception $e) {
            // Something else happened, completely unrelated to Stripe
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        }
        
        // if nothing is returned above, return null.  should never happen.
        return null;
    }
    //-------------------------------------------------------------------------------------------
    function getPlan() {
        global $stripeConfig;
        
        $resp['code'] = '';
        $resp['message'] = '';
        
        try {
            $resp = Stripe_Plan::retrieve($stripeConfig["plan"]);
            return $resp;
        }  catch(Stripe_CardError $e) {
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_InvalidRequestError $e) {
            // Invalid parameters were supplied to Stripe's API
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_AuthenticationError $e) {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_ApiConnectionError $e) {
            // Network communication with Stripe failed
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_Error $e) {
            // Display a very generic error to the user, and maybe send
            // yourself an email
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Exception $e) {
            // Something else happened, completely unrelated to Stripe
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        }
        
        // if nothing is returned above, return null.  should never happen.
        return null;
        
    }
    //-------------------------------------------------------------------------------------------
    
    function saveCustomer() {
        dbConnect();
        
        if(!isset($this->uRec)) {
            logit(WARN, "No uRec in Stripe in ".__FILE__." on line: ".__LINE__);
            return "No uRec";
        }
        
        $sql = "SELECT card, stripeId, email FROM stripeAuth WHERE uRec=" . $this->uRec;
        
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc) && $row["stripeId"] != null ) {
                // Customer found in DB.  Has a stripe record.
                $this->stripeId = $row["stripeId"];
                return $this->updateCustomer();
            }
            
            // No stripe record yet
            else {
                
                $resp['code'] = '';
                $resp['message'] = '';
                
                try {
                    
                    $resp = Stripe_Customer::create(array(
						"email" => $this->email,
						"card" => $this->card
                    ));
                    $this->stripeId = $resp['id'];
                    $this->saveCustomerToDb();
                    
                    $resp['code'] = 'OK';
                    $resp['message'] = '';
                    return $resp;
                    
                } catch(Stripe_CardError $e) {
                    $body = $e->getJsonBody();
                    $resp  = $body['error'];
                    return $resp;
                } catch (Stripe_InvalidRequestError $e) {
                    // Invalid parameters were supplied to Stripe's API
                    $body = $e->getJsonBody();
                    $resp  = $body['error'];
                    return $resp;
                } catch (Stripe_AuthenticationError $e) {
                    // Authentication with Stripe's API failed
                    // (maybe you changed API keys recently)
                    $body = $e->getJsonBody();
                    $resp  = $body['error'];
                    return $resp;
                } catch (Stripe_ApiConnectionError $e) {
                    // Network communication with Stripe failed
                    $body = $e->getJsonBody();
                    $resp  = $body['error'];
                    return $resp;
                } catch (Stripe_Error $e) {
                    // Display a very generic error to the user, and maybe send
                    // yourself an email
                    $body = $e->getJsonBody();
                    $resp  = $body['error'];
                    return $resp;
                } catch (Exception $e) {
                    // Something else happened, completely unrelated to Stripe
                    $body = $e->getJsonBody();
                    $resp  = $body['error'];
                    return $resp;
                }
                
                // if nothing is returned above, return null.  should never happen.
                return null;
            }
        }
        else {
            logit(WARN, " DB Error: $sql in ".__FILE__." on line: ".__LINE__);
        }
        return null;
    }
    
    //-------------------------------------------------------------------------------------------
    function updateCustomer() {
        
        $cu = Stripe_Customer::retrieve($this->stripeId);
        $cu->email = $this->email;
        if(!empty($this->couponCode)){
            $cu->coupon = $this->couponCode;
        }
        
        if ( $this->card != null ) {
            $cu->card = $this->card;
        }
        
        $resp['code'] = '';
        $resp['message'] = '';
        
        try {
            $cu->save();
            $this->saveCustomerToDb();
            $resp['code'] = 'OK';
            $resp['message'] = '';
            return $resp;
        } catch(Stripe_CardError $e) {
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_InvalidRequestError $e) {
            // Invalid parameters were supplied to Stripe's API
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_AuthenticationError $e) {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_ApiConnectionError $e) {
            // Network communication with Stripe failed
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_Error $e) {
            // Display a very generic error to the user, and maybe send
            // yourself an email
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Exception $e) {
            // Something else happened, completely unrelated to Stripe
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        }
        
        // if nothing is returned above, return null.  should never happen.
        return null;
        
    }
    //-------------------------------------------------------------------------------------------
    
    function deleteCustomer() {
        dbConnect();
        
        $sql = "SELECT card, stripeId, email FROM stripeAuth WHERE uRec=" . $this->uRec;
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                if ( $row["stripeId"] == null ) {
                    logit(INFO, " Stripe account not found - could not delete in ".__FILE__." on line: ".__LINE__);
                    return;
                }
                $this->stripeId = $row["stripeId"];
                $cu = Stripe_Customer::retrieve($this->stripeId);
                
                if ( $cu->object != "customer" ) {
                    logit(INFO, " Stripe account not found - could not delete in ".__FILE__." on line: ".__LINE__);
                    return;
                }
                
                $resp = $cu->delete();
                
                if ( $resp["deleted"] != true ) {
                    logit(WARN, " Stripe error - could not delete customer in ".__FILE__." on line: ".__LINE__);
                    logit(WARN, print_r($resp, 1));
                    return false;
                }
            }
            else {
                logit(INFO, " Stripe account not found - could not delete in ".__FILE__." on line: ".__LINE__);
                return;
            }
        }
        else {
            logit(WARN, " DB Error: $sql in ".__FILE__." on line: ".__LINE__);
            return;
        }
        $resp['code'] = 'OK';
        logit(INFO, "Delete Customer| stripe id: {$this->stripeId}, urec: {$this->uRec}" );
        return $resp;
    }
    //-------------------------------------------------------------------------------------------
    function updateSubscription() {
        
        $resp['code'] = '';
        $resp['message'] = '';
        
        try {
            $cu = Stripe_Customer::retrieve($this->stripeId);
            if ( $this->couponCode )
                $cu->updateSubscription(array(
                    "plan" => "10Monthly30Free",
                    "coupon" => $this->couponCode
                ));
            else {
                $cu->updateSubscription(array(
                    "plan" => "10Monthly30Free"
                ));
            }
            $resp['code'] = 'OK';
            $resp['message'] = '';
            return $resp;
            
        } catch(Stripe_CardError $e) {
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_InvalidRequestError $e) {
            // Invalid parameters were supplied to Stripe's API
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_AuthenticationError $e) {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_ApiConnectionError $e) {
            // Network communication with Stripe failed
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_Error $e) {
            // Display a very generic error to the user, and maybe send
            // yourself an email
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Exception $e) {
            // Something else happened, completely unrelated to Stripe
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        }
        
        // if nothing is returned above, return null.  should never happen.
        return null;
    }
    //-------------------------------------------------------------------------------------------
    function chargeCustomer() {
        
        $resp['code'] = '';
        $resp['message'] = '';
        
        try {
            $cu = Stripe_Customer::retrieve($this->stripeId);
            $card = $cu->cards->data[0]->id;
            
            Stripe_Charge::create(array(
                "amount" => $this->amount,
                "currency" => "usd",
                "customer" => $this->stripeId,
                "description" => "Charge for C3HealthLink.com"
            ));      
            
            $resp['code'] = 'OK';
            $resp['message'] = '';
            return $resp;
            
        } catch(Stripe_CardError $e) {
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_InvalidRequestError $e) {
            // Invalid parameters were supplied to Stripe's API
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_AuthenticationError $e) {
            // Authentication with Stripe's API failed
            // (maybe you changed API keys recently)
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_ApiConnectionError $e) {
            // Network communication with Stripe failed
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Stripe_Error $e) {
            // Display a very generic error to the user, and maybe send
            // yourself an email
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        } catch (Exception $e) {
            // Something else happened, completely unrelated to Stripe
            $body = $e->getJsonBody();
            $resp  = $body['error'];
            return $resp;
        }
        
        // if nothing is returned above, return null.  should never happen.
        return null;
        
        $resp['code'] = 'OK';
        logit(INFO, "Charge Customer| charge: {$this->amount}, percent_off: {$this->percent_off}, stripe id: {$this->stripeId}, urec: {$this->uRec}" );
        return $resp;
    }
    //-------------------------------------------------------------------------------------------
    function saveCustomerToDb() {
        $in['uRec'] = $this->uRec;
        $in['stripeId'] = $this->stripeId;
        $in['card'] = $this->card;
        $in['email'] = sqlClean(psyEncrypt(strip_tags(strtolower($this->email))));
        
        $sql="SELECT * FROM stripeAuth WHERE uRec=". $in['uRec'];
        $id = 0;
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                $id = $row["id"];
                $update=true;
            }else{
                $update=false;
            } 
        }else{ 
            logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        if ($update){
            $sql="UPDATE stripeAuth ".makeSql($in,"update")." WHERE id=$id ";
        }else{
            $sql="INSERT INTO stripeAuth ".makeSql($in,"insert");
        }
        
        if($rc=dbQuery($sql)) {
            logit(INFO, 'save customer| sql: '. $sql);
        }else{
            logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
            return false;
        }
        
    }
    
    //-------------------------------------------------------------------------------------------
    function setAsDelinquent() {
        $in['uRec'] = $this->uRec;
        $in['paymentDelinquent'] = 1;

        $sql="SELECT * FROM stripeAuth WHERE uRec=". $in['uRec'];
        
        $id = 0;
        
        if ($rc=dbQuery($sql)) {
            if ($row=dbFetch($rc)) {
                $id = $row["id"];
                $update=true;
            }else{
                $update=false;
            } 
        }else{ 
            logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
        }
        
        if ($update){
            $sql="UPDATE stripeAuth ".makeSql($in,"update")." WHERE id=$id ";
        }else{
            $sql="INSERT INTO stripeAuth ".makeSql($in,"insert");
        }
        if($rc=dbQuery($sql)) {
            logit(INFO, 'set customer as delinquent| sql: '. $sql);
        }else{
            logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
            return false;
        }
    }
    //-------------------------------------------------------------------------------------------
    
    
} // ec

?>
