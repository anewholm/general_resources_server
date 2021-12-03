<?php require_once('settings.php'); ?>
<?php require_once('header.php'); ?>
<?php
    $output = '';

    print('<div id="warnings">');
    //-------------------------------------------- XSL contents checks
    $output .= '<h2>XSL root declared namespaces and @exclude-result-prefixes</h2>';
    if (!file_exists($xsl_file)) print('<div class="last-error">' . $xsl_file . ' not found</div>');
    $xsl = new DOMDocument();
    $xsl->load($xsl_file);
    $contents = file_get_contents($xsl_file);
    
    foreach ($xsl->documentElement->childNodes as $root) {
        if ($root->nodeType == XML_ELEMENT_NODE) break;
    }
    
    //namespaces
    $namespaces = array();
    $xpath      = new DOMXPath($xsl);
    $output    .= 'xsl:stylesheet/@xmlns:* = <ul>';
    foreach( $xpath->query('namespace::*', $xsl->documentElement) as $node )
        $namespaces[$node->localName] = $node->nodeValue;
    foreach ($namespaces as $prefix => $namespace)
        $output .= '<li><b style="color:green">' .$prefix . '</b> = ' . $namespace . '</li>';
    $output .= '</ul>';
    
    //non-root namespace declerations
    $num = preg_match_all('/<xsl:stylesheet.*>.* xmlns:([^=]+)/', $contents, $matches);
    $found_prefixes = array();
    for ($i = 0; $i < $num; $i++) {
        $prefix = $matches[1][$i];
        $found_prefixes[$prefix] = 1;
    }
    $output .= 'discovered non-root //@xmlns:* = <ul>';
    foreach ($found_prefixes as $prefix => $value) {
        $namespace = '?';
        $class = '';
        if (isset($namespaces[$prefix])) $namespace = $namespaces[$prefix];
        else $class = 'not-found';
        $output .= "<li class='$class'>$prefix = $namespace</li>";
    }
    $output .= '</ul>';

    //undeclared namespace usage
    $num = preg_match_all('/([a-z0-9_-]+):[a-z*]/', $contents, $matches);
    $found_prefixes = array();
    for ($i = 0; $i < $num; $i++) {
        $prefix = $matches[1][$i];
        if (   $prefix != 'xmlns' 
            && $prefix != 'view-source'
            && $prefix != 'display'
            && $prefix != 'background-image'
        )
            $found_prefixes[$prefix] = 1;
    }
    $output .= 'discovered prefixes:* = <ul>';
    foreach ($found_prefixes as $prefix => $value) {
        $namespace = '?';
        $class = '';
        if (isset($namespaces[$prefix])) $namespace = $namespaces[$prefix];
        else $class = 'not-found';
        $output .= "<li class='$class'>$prefix = $namespace</li>";
    }
    $output .= '</ul>';

    //attributes
    $output .= '@exclude-result-prefixes = <ul id="exclude-result-prefixes">';
    $exclude_result_prefixes = $xsl->documentElement->getAttribute('exclude-result-prefixes');
    $exclude_result_prefixes_array = explode(' ', trim($exclude_result_prefixes));
    foreach ($exclude_result_prefixes_array as $result_prefix) {
        $class = '';
        if ($result_prefix != '#default' && !isset($namespaces[$result_prefix])) $class = 'not-found';
        $output .= "<li class='$class'>$result_prefix</li>";
    }
    $output .= '</ul><hr/>';
    
    //-------------------------------------------- XML contents checks
    $output .= '<h2>XML root declared namespaces</h2>';
    if (!file_exists($xml_file)) print('<div class="last-error">' . $xml_file . ' not found</div>');
    $xml = new DOMDocument();
    $xml->load($xml_file);
    
    foreach ($xml->documentElement->childNodes as $root) {
        if ($root->nodeType == XML_ELEMENT_NODE) break;
    }
    
    //namespaces
    $namespaces = array();
    $xpath      = new DOMXPath($xml);
    $output    .= '<ul>';
    foreach( $xpath->query('namespace::*', $xml->documentElement) as $node )
        $namespaces[$node->localName] = $node->nodeValue;
    foreach ($namespaces as $prefix => $namespace)
        $output .= '<li><b style="color:green">' .$prefix . '</b> = ' . $namespace . '</li>';
    $output .= '</ul>';

    //undeclared namespace usage
    $contents = file_get_contents($xml_file);
    $num = preg_match_all('/([a-z0-9_-]+):[a-z*]/', $contents, $matches);
    $found_prefixes = array();
    for ($i = 0; $i < $num; $i++) {
        $prefix = $matches[1][$i];
        if (   $prefix != 'xmlns' 
            && $prefix != 'xmlns' 
            && $prefix != 'view-source'
            && $prefix != 'display'
            && $prefix != 'background-image'
        )
            $found_prefixes[$prefix] = 1;
    }
    $output .= 'discovered prefixes:* = <ul>';
    foreach ($found_prefixes as $prefix => $value) {
        $namespace = '?';
        $class = '';
        if (isset($namespaces[$prefix])) $namespace = $namespaces[$prefix];
        else $class = 'not-found';
        $output .= "<li class='$class'>$prefix = $namespace</li>";
    }
    $output .= '</ul>';

    //-------------------------------------------- analysis
    //this will generate our warnings / errors
    //we DO NOT include the output though because it would take over the page!
    $transform = new Transform($xml_file, $xsl_file);
    $result    = $transform->transformToXML();
    if ($result) $output .= 'non-zero result :)';
    print('</div>');
?>
<?php print($output); ?>
<?php require_once('footer.php'); ?>
