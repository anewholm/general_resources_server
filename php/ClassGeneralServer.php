<?php
//DOMDocument required

class GeneralServer {
  private $m_sXMLHeader = '<?xml version="1.0" encoding="utf-8"?>';
  
  private $m_sURI;
  private $m_sUsername;
  private $m_sPasswordHash;
  private $m_sToken;

  function __construct( $sDomain, $sProtocol = 'http', $iPort = 8776, $sAPIEndPoint = '', $sMode = 'xml' ) {
    if ( substr( $sDomain, -1 ) == '/' ) {
      $sDomain = substr( $sDomain, 0, -1 );
      trigger_error( 'GeneralServer() domain parameter should not end with forward slash' );
    }

    if ( strstr( $sDomain, '://' ) ) {
      $sDomain = substr( $sDomain, strstr( $sDomain, '://' ) + 3 );
      trigger_error( 'GeneralServer() domain parameter should not contain the protocol' );
    }
    
    if ( substr( $sAPIEndPoint, -1 ) == '/' ) {
      $sAPIEndPoint = substr( $sAPIEndPoint, 0, -1 );
      trigger_error( 'GeneralServer() API endpoint parameter should not end with forward slash' );
    }

    switch ( $sMode ) {
      case 'xml': header( 'Content-Type: text/xml; charset=UTF-8', TRUE ); break;
    }
    
    $this->m_sURI = "$sProtocol://$sDomain:$iPort$sAPIEndPoint";
  }
  
  //----------------------------------------------------- utilities
  private function NOT_COMPLETE( $sWhy ) {
  }
  
  private function queryStringAdd( $sQueryString, $sItem, $sValue ) {
    if ( ! $sItem )  return $sQueryString;
    if ( ! $sValue ) return $sQueryString;
    return $sQueryString . ( strchr( $sQueryString, '?' ) ? '&' : '?' ) . "$sItem=$sValue";
  }

  private function xmlDebugAdd( $sXML, $sDebug ) {
    return $sXML;
    //return "<!-- $sDebug -->" . $sXML;
    //return preg_replace( '^<?xml [^>]*>', $this->m_sXMLHeader . "<!-- $sDebug -->", $sXML );
  }


  //----------------------------------------------------- public interface
  function hash( $sPassword ) {
    //SECURITY: todo
    return $sPassword;
  }
  
  function login( $sUsername, $m_sPasswordHash ) {
    $this->m_sUsername     = $sUsername;
    $this->m_sPasswordHash = $m_sPasswordHash;
    $this->m_sToken        = $m_sPasswordHash;
  }
  
  function queryObjects( $sAbsoluteXPath ) {
    $this->NOT_COMPLETE();
  }
  
  function queryAndOutputHTML( $sAbsoluteXPath, $view = 'default' ) {
    $this->NOT_COMPLETE();
  }
  
  function queryAndOutputXML( $sAbsoluteXPath, $sNodeMask = '.', $sSchema = 'data' ) {
    $dom = $this->query( $sAbsoluteXPath, $sNodeMask, $sSchema );
    print( trim( $dom->saveXML() ) );
    return $dom;
  }
  
  function query( $sAbsoluteXPath, $sNodeMask = '.', $sSchema = 'data' ) {
    $dom = new DOMDocument();
    
    if ( ! $sAbsoluteXPath ) {
      $sAbsoluteXPath = '/';
      trigger_error( 'GeneralServer->query() xpath parameter should not be empty' );
    }
    /* consider function calls etc.
    if ( $sAbsoluteXPath[0] != '/' ) {
      $sAbsoluteXPath = '/' . $sAbsoluteXPath;
      trigger_error( 'GeneralServer->query() xpath parameter should be absolute' );
    }
    */
    
    $sRequestURI = "$this->m_sURI/$sAbsoluteXPath";
    $sRequestURI = $this->queryStringAdd( $sRequestURI, 'node-mask', $sNodeMask );
    $sRequestURI = $this->queryStringAdd( $sRequestURI, 'username',  $this->m_sUsername );
    $sRequestURI = $this->queryStringAdd( $sRequestURI, 'token',     $this->m_sToken );
    $sRequestURI = $this->queryStringAdd( $sRequestURI, 'schema',    $sSchema );
    
    //TODO: examine if file_get_contents() can actually do this
    //maybe use HTTP request as a fallback
    $sXML  = file_get_contents( $sRequestURI );
    $sXML  = trim( $sXML );
    $sXML  = $this->xmlDebugAdd( $sXML, $sRequestURI );
    $dom->loadXML( $sXML );
    
    return $dom;
  }
}
