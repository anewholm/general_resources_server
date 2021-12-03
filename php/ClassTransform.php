<?php
class Transform {
  private $m_xml;
  private $m_xsl;
  
  function __construct($xml_file, $xsl_file) {
    $this->m_xml = new DOMDocument();
    $this->m_xml->load($xml_file);
    
    $this->m_xsl = new DOMDocument();
    $this->m_xsl->load($xsl_file);
  }
  
  public function transformToXML() {
    $proc = new XSLTProcessor();
    $proc->importStyleSheet($this->m_xsl); // XSL Document importieren
    return $proc->transformToXML($this->m_xml);
  }
}
