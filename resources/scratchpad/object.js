//-------------------------------------------- Factory --------------------------------------------
function createItemClass(_jItemClass, _owner) {
    var type = _jItemClass.find(".item_class_type").text();
    if (!type || !window[type]) type = 'Item';   //default to Item
    cgroup("[" + type + "] creation");
    var o = new window[type](_jItemClass, _owner);
    cgroupend();
    return o;
}

//-------------------------------------------- HTMLObject --------------------------------------------
function HTMLObject(_jHTMLElement) {
    this.jHTMLElement = _jHTMLElement;
    if (!arguments.length) return this;

    //register item in global lookups
    this.hid                   = this.hA("id");  //@id cannot be numeric because HTML IDs must start with a letter
    this.id                    = this.hV(".id"); //.id should be the real numeric id <div class="xtransport id">334534</div>
    this.HTMLObjects[this.hid] = this;           //use the hid because it includes object type identifier (BUS45) which distinguishes from other similar IDs
}
HTMLObject.prototype.HTMLObjects = new Object(); //keyed on generic unique id attribute
HTMLObject.fromHID = function fromHID(hid) {
    return HTMLObject.prototype.HTMLObjects[hid];
}
HTMLObject.fromID = function fromID(typespecifier, id) {
    return this.fromHID(typespecifier + id);
}
HTMLObject.prototype.toString = function toString() {return this.hid;}
HTMLObject.prototype.hI = function hI(path) {return this.jHTMLElement.find(path);}
HTMLObject.prototype.hV = function hV(path) {return this.hI(path).text();}
HTMLObject.prototype.hX = function hX(path) {return this.hI(path).length != 0;}
HTMLObject.prototype.hB = function hB(path) {var v = this.hV(path);return v != 'false' && v != '0' && v != '' ;} //boolean
HTMLObject.prototype.hA = function hA(name) {return this.jHTMLElement.attr(name);}

//-------------------------------------------- Item --------------------------------------------
function Item(jHTMLElement, _owner) {
    HTMLObject.apply(this, arguments);
    if (!arguments.length) return this;
    var self = this;

    //incorporates all the things that a client-side 9carrots entity may need
    //geo entity that can appear on a map, have a list entry, etc.
    //all built of microformat specification in the HTML
    //requires jQuery

    //base values (http://microformats.org/wiki/geo)
    this.owner           = this._owner;
    this.map             = null;
    this.draggable       = this.hX(".draggable");
    this.hasGEO          = this.hX(".geo");
    this.entityid        = this.hV(".entityid");
    this.lat             = this.hV(".latitude");
    this.lng             = this.hV(".longitude");
    this.distance_centre = null;
    this.title           = this.hV(".title:first");
    this.jInfoWindow     = this.hI(".infowindow");
    this.relevance       = true;
    this.item_class_type = this.hV(".item_class_type");
    this.regions         = [];

    //items lookup
    this.items[this.hid] = this;

    //attach info window events (before bind so that events are cloned)
    this.addInfoWindowEvents();

    //create the marker
    if (window.GMap2 && this.hasGEO) {
        var icon, jIcon = this.hI(".widget_marker_image");
        if (jIcon.length) icon = new Icon(jIcon.eq(0));
        this.marker = new Marker(this.lat, this.lng, this.title, icon, this.draggable, this.jInfoWindow, this);
    }

    //regions
    this.jHTMLElement.find(".regions > li").each(function(i, _HTMLElement){
        self.regions.push(new Region($(_HTMLElement), self));
    });

    //add events to the main list item
    this.jHTMLElement.click(function(e){
        self.openInfoWindow();
        e.preventDefault();
        return false;
    }).removeClass("disabled");
    this.hI(".title").click(function(e){
        self.openInfoWindow();
        e.preventDefault();
        return false;
    }).removeClass("disabled");
    if (window.ismobiledevice != true) {
        this.jHTMLElement.mouseover(function(){self.mouseover(true);});
        this.jHTMLElement.mouseout(function(){self.mouseout(true);});
    }

    cinfo("[" + this.hid + ":" + this.id + ":" + this.title + ":" + this.item_class_type + "," + this.lat + "," + this.lng + "," + this.draggable + "]");
}
Item.prototype             = new HTMLObject();
Item.prototype.items       = new Object(); //keyed on generic unique id attribute
Item.prototype.highlighted = null;
Item.prototype.toString = function toString() {return this.hid;}

//static functions
Item.fromHID = function fromHID(hid) {
    return Item.prototype.items[hid];
}
Item.ggMarkers = function ggMarkers(items) {
    var item, ggMarkers = [];
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        if (item.marker) ggMarkers.push(item.marker.ggMarker);
    }
    return ggMarkers;
}

Item.prototype.setMap = function setMap(_map) {
    if (this.marker) this.marker.setMap(_map);
    else cerror("cannot set map, no marker yet!");
    for (var i = 0; i < this.regions.length; i++) this.regions[i].setMap(_map);
    return this.map = _map;
}

Item.prototype.addInfoWindowEvents = function addInfoWindowEvents() {
    var self = this;
    this.jHTMLElement.find(".blowup").click(function(){self.showMapBlowup();} ).removeClass("disabled");
    //this.jHTMLElement.find(".directions").click(function(){self.showDirections();}).removeClass("disabled");
}

//Maps events
Item.prototype.click           =  function click()           {if (window.item_click)           window.item_click(this);}
Item.prototype.infowindowopen  =  function infowindowopen()  {if (window.item_infowindowopen)  window.item_infowindowopen(this);}
Item.prototype.infowindowclose =  function infowindowclose() {if (window.item_infowindowclose) window.item_infowindowclose(this);}

//facades
Item.prototype.getLatLng       = function getLatLng()                      {if (this.marker) return this.marker.getLatLng();}
Item.prototype.showMapBlowup   = function showMapBlowup()                  {if (this.marker) return this.marker.showMapBlowup();}
Item.prototype.panTo           = function panTo()                          {if (this.marker) return this.marker.panTo();}
Item.prototype.showDirections  = function showDirections()                 {alert('not supported yet');}
Item.prototype.openInfoWindow  = function openInfoWindow(jIW, options)     {if (this.marker) return this.marker.openInfoWindow(jIW, options);}
Item.prototype.closeInfoWindow = function closeInfoWindow()                {if (this.marker) return this.marker.closeInfoWindow();}
Item.prototype.selectTab       = function selectTab(n)                     {
    var infowindow;
    if (this.map) {
        if (infowindow = this.map.getInfoWindow()) infowindow.selectTab(n);
    }
    return this;
}

Item.prototype.change_size =     function change_size(newwidth, newheight) {
    if (this.marker && this.marker.change_size(newwidth, newheight)) this.matchMarker();
}
Item.prototype.revert_original = function revert_original()                {
    if (this.marker && this.marker.revert_original()) this.matchMarker();
}
Item.prototype.revert_last =     function revert_last()                    {
    if (this.marker && this.marker.revert_last()) this.matchMarker();
}
Item.prototype.change_icon =     function change_icon(icon)                {
    if (this.marker && this.marker.change_icon(icon)) this.matchMarker();
}
Item.prototype.change_shadow =     function change_shadow(shadow)                {
    if (this.marker && this.marker.change_shadow(shadow)) this.matchMarker();
}

Item.prototype.matchMarker = function matchMarker() {
    if (this.marker) {
        var image = this.jHTMLElement.find(".widget_marker_image");
        image.attr("src", this.marker.icon.src);
        image.height(     this.marker.icon.height);
        image.width(      this.marker.icon.width);
    }
}

Item.prototype.relevant = function relevant(_relevance) {
    return this.relevance = _relevance;
}

Item.prototype.listentry_show = function listentry_show(speed) {
    if (this.jHTMLElement) this.jHTMLElement.show(speed);
}
Item.prototype.listentry_hide = function listentry_hide(speed) {
    if (this.jHTMLElement) this.jHTMLElement.hide(speed);
}
Item.prototype.setValue = function setValue(name, value, formatfunc) {
    this[name]         = value;
    var formattedValue = (formatfunc ? formatfunc(value) : value);
    if (this.jHTMLElement) this.jHTMLElement.find("." + name).text(formattedValue);
}
Item.prototype.mouseover =   function mouseover(fromitem)   {
    if (Item.prototype.highlighted) Item.prototype.highlighted.dehighlight();
    this.highlight(fromitem);
}
Item.prototype.mouseout  =   function mouseout(fromitem)    {this.dehighlight(fromitem);}
Item.prototype.highlight =   function highlight(fromitem)   {
    if (this.marker) this.marker.highlight(fromitem);
    this.jHTMLElement.addClass("highlight");
    if (window.item_highlight) window.item_highlight(this, fromitem);
    Item.prototype.highlighted = this;
}
Item.prototype.dehighlight = function dehighlight(fromitem) {
    if (this.marker) this.marker.dehighlight(fromitem);
    this.jHTMLElement.removeClass("highlight");
    if (window.item_dehighlight) window.item_dehighlight(this, fromitem);
    Item.prototype.highlighted = null;
}

Item.prototype.showRegions = function showRegions() {
    for (var i = 0; i < this.regions.length; i++) this.regions[i].show_region();
}
Item.prototype.hideRegions = function hideRegions() {
    for (var i = 0; i < this.regions.length; i++) this.regions[i].hide_region();
}

//-------------------------------------------- User --------------------------------------------
function User(_jHTMLElement, _owner) {
    Item.apply(this, arguments);
    if (!arguments.length) return this;

    //base values
    this.coentityid = user_coentityid;
    this.isadmin    = user_isadmin;

    cinfo("userid [" + this.id + "]");
}
User.prototype = new Item();
User.prototype.moved = function moved(latlng, marker) {
    if (window.user_moved) window.user_moved(this, latlng, marker);
}

//-------------------------------------------- Region --------------------------------------------
function Region(_jHTMLElement, _owner) {
    HTMLObject.apply(this, arguments);
    if (!arguments.length) return this;
    var self = this;

    //base values
    this.owner       = _owner;
    this.name        = this.jHTMLElement.children(".name").text();
    this.title       = this.name;                                         //polygon record compatable
    this.description = this.jHTMLElement.children(".description").text(); //polygon record compatable
    this.polygon     = null;
    this.map         = null;
    this.visible     = false;

    //points (vertexes)
    this.coordinates = []; //polygon record compatable
    this.jHTMLElement.find(".coords > li").each(function(i, _HTMLElement){
        self.coordinates.push(new GLatLng($(_HTMLElement).children(".lat").text(), $(_HTMLElement).children(".lng").text()));
    });

    cinfo("Region registration [" + this.name + "]");
}
Region.prototype          = new HTMLObject();
Region.prototype.toString = function toString(){return "[" + this.name + "]";}
Region.prototype.setMap   = function setMap(_map) {this.map = _map;}

Region.prototype.show_region = function show_region() {
    if (this.map && GPolygon && !this.visible && this.coordinates.length) {
        //lazy creation of polygon
        if (!this.polygon) {
            //if the API for editing polygons is available then use it, otherwise just create a normal read-only GPolygon
            if (this.map.polygonControl) {
                //create editable
                this.polygon = this.map.polygonControl.loadPolygons(this);
            } else {
                //create read-only
                this.polygon = new GPolygon(this.coordinates, "#000000", 3, 0.25, "#0000FF", 0.45, {clickable:false}); //create read-only
            }
            //label in the centre of the polygon
            var FLOAT_MULTIPLIER = 1000000000;
            var clat = this.coordinates[0].lat() * FLOAT_MULTIPLIER;
            var clng = this.coordinates[0].lng() * FLOAT_MULTIPLIER;
            var ggPoint;
            for (var i = 1; i < this.coordinates.length; i++) {
                ggPoint = this.coordinates[i];
                clat = (clat + ggPoint.lat() * FLOAT_MULTIPLIER) / 2;
                clng = (clng + ggPoint.lng() * FLOAT_MULTIPLIER) / 2;
            }
            var ggCPoint = new GLatLng(clat / FLOAT_MULTIPLIER, clng / FLOAT_MULTIPLIER);
            //construct label HTML DOM
            var node = document.createElement('div');
            node.className = 'google_label region';
            var title_node = document.createElement('div');
            title_node.className = 'region_title';
            title_node.appendChild(document.createTextNode(this.title));
            node.appendChild(title_node);
            var description_node = document.createElement('div');
            description_node.className = 'region_description';
            description_node.appendChild(document.createTextNode(this.description));
            node.appendChild(description_node);
            //create label
            this.label = new HTMLPane(node, ggCPoint);
        }
        //add overlays
        this.map.addOverlay(this.polygon);
        this.map.addOverlay(this.label);
        this.visible = true;
    }
}

Region.prototype.hide_region = function hide_region() {
    if (this.map && this.polygon && this.visible) {
        this.map.removeOverlay(this.polygon);
        this.map.removeOverlay(this.label);
        this.visible = false;
    }
}
