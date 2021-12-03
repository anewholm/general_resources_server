<?php require_once('settings.php'); ?>
<?php require_once('header.php'); ?>
<pre>
  <?php
      $xml    = file_get_contents($xsl_file);
      $xml    = preg_replace('/alert\(([^)]*if you are seeing this)/', '//alert($1', $xml);
      print(htmlspecialchars($xml));
  ?>
</pre>
<?php require_once('footer.php'); ?> 
