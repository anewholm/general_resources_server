<?php require_once('settings.php'); ?>
<?php
    if (!file_exists($xsl_file)) print('<div class="last-error">' . $xsl_file . ' not found</div>');
    else {
      $xsl = new DOMDocument();
      $xsl->load($xsl_file);

      if (!file_exists($xml_file)) print('<div class="last-error">' . $xml_file . ' not found</div>');
      else {
        $xml = new DOMDocument();
        $xml->load($xml_file);
        
        $help_injection = <<<HTML
          <div>
            <b>last transform: </b>
            this pane is injected in to the HTML by the PHP transformer
          </div>
HTML;
        $help_injection .= file_get_contents('navigation.php');
        $help_injection = str_replace('<?=$path_to_dir?>', $path_to_dir, $help_injection);

        $transform = new Transform($xml_file, $xsl_file);
        $output = $transform->transformToXML();
        $output = preg_replace('/(<head[^>]*>)/', "$1<link rel='stylesheet' href='$path_to_dir/transform.css'/>", $output);
        $output = preg_replace('/(<head[^>]*>)/', '$1<base href="http://general_server.localhost:8776"/>', $output);
        $output = preg_replace('/(<body[^>]*>)/', "$1<div id='gs-last-transform'>$help_injection</div>", $output);

        print($output);
      }
    }
?>
