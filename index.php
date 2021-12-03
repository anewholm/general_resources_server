<html>
  <head>
      <link rel="shortcut icon" href="http://general-resources-server.localhost/resources/shared/favicon.ico"></link>
      <link rel="icon" href="http://general-resources-server.localhost/resources/shared/favicon.ico" type="image/x-icon"></link>
    <style>
      body {
        font-family:Trebuchet MS, verdana;
        font-size:14px;
      }
      ul {
        list-style-image:url(/resources/shared/images/icons/folder.png);
      }
      ul li {
        line-height:14px;
      }
    </style>
  </head>

  <body>
    <h1>General Resources Server</h1>

    <p>
    This server provides resources for General Server instances. For example images and other binary files.
    Anything that is not valid XML. Because General Server should only be used for XML serving:
    HTML, XML, Javascript, CSS, XSL, Xschema, etc.
    Note that, of course, things like CSS are also valid XML as they are simple text nodes.
    </p>

    <p>
    Although 3rd party Javascript - CSS plugins like CodeMirror can be served from this resources server it is also reasonable to serve
    them from within the primary GS server. They must be uploaded through the IDE so that they are encoded properly.
    </p>

    <p>
    Sub-folders are all under the <a href="/resources">resources</a> directory because General Server handles resources differently.
    And this may be using a GS to serve the resources also.
    </p>

<?php
function find_all_files($dir, $depth, $show_files = true, $path = '')
{
    $root = scandir($dir);

    print("<ul>");
    foreach($root as $value) {
        if ($value != '.' && $value != '..') {
          $link   = "$path/$value";
          $is_dir = is_dir("$dir/$value");
          if ($is_dir) $link .= '/';

          if ($show_files || $is_dir) print("<li><a href=\"$link\">$value</a>");

          if ($is_dir && $depth-- > 0) find_all_files("$dir/$value/", $depth, false, "$path/$value");
          if ($show_files || $is_dir) print("</li>");
        }
    }
    print("</ul>");
}

find_all_files(getcwd(), 1, false);
?>
  </body>
</html>
