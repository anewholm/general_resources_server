<?php
require_once( 'ClassGeneralServer.php' );
//this will already output the text/html header. Set mode parameter to not xml to prevent this
$GS = new GeneralServer( 'general_server.localhost', 'http', 8776, '/api' );

//xml query outputs
//$GS->login( 'anewholm', $GS->hash( 'test' ) ); 
$dom = $GS->queryAndOutputXML( '/config/websites/*', '.' );
