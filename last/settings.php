<?php
require_once('../php/ClassTransform.php');

$xml_file      = 'response.xml';
$xsl_file      = 'stylesheet.xsl';
$path          = 'http://' . $_SERVER['SERVER_NAME'] . ':' . $_SERVER['SERVER_PORT'] . $_SERVER['REQUEST_URI'];
$path_to_dir   = preg_replace('/\/[^\/]*$/', '', $path);
$path_to_index = "$path_to_dir/index.php";
?>
