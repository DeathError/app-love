var app = {
    SOME_CONSTANTS : false,
    initialize: function() {
        this.bindEvents();
        this.initFastClick();
        this.receivedEvent();
        this.onDeviceReady();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    initFastClick : function() {
        window.addEventListener('load', function() {
            FastClick.attach(document.body);
        }, false);
        var blockMenu = $('.block-menu_left');

        $(".block-menus, input.menu-bottom").click(function () {
            $('.block-menu_left .menu-items').toggleClass('open-menu');
        });

        $('a[href^="#"], a[href^="."]',blockMenu).click( function(){
            var nameSlid = $(this).attr('slid'),
                scroll_el = $("#slider_pagination a:nth-child("+nameSlid+")");
            $(scroll_el).click();
            return false;
        });
    },
    onDeviceReady: function() {
        $(".effect-text > h1").lettering('words').children("span").lettering().children("span").lettering();
    },
    receivedEvent: function() {
        var parentElement = document.getElementById('slider');
        $(parentElement).carouFredSel({
                width: '100%',
                height: '100%',
                mousewheel: true,
                align: 'auto',
                items: {
                    visible: {
                        min: 1,
                        max: 1
                    }
                },
                prev: {
                    button: '.nivo-nextNavSlider',
                    easing: scroll.easing,
                    onBefore: scroll.onBefore,
                    onAfter : scroll.onAfter
                },
                next: {
                    button: '.nivo-prevNavSlider',
                    easing: scroll.easing,
                    onBefore: scroll.onBefore,
                    onAfter : scroll.onAfter
                },
                pagination:{
                    container: "#slider_pagination",
                    easing: scroll.easing,
                    onBefore: scroll.onBefore,
                    onAfter : scroll.onAfter
                },
                scroll: {
                    items: 1,
                    easing: "cubic",
                    pauseOnHover: true,
                    onBefore: function( data ) {
                        var objects = data.items.old;
                        unhighlight(objects);
                    },
                    onAfter : function( data ) {
                        var objects = data.items.visible;
                        highlight(objects);
                    }
                },
                auto: false,
                autoPlay: false,
                circular: false,
                infinite: false
            }, {
                debug:false,
                transition:true,
                wrapper:{
                    element: "div",
                    classname: "caroufredsel_slider"
                }
            }
        );
        $(".slider-item",parentElement).swipe({
            swipe:function(event, direction, distance, duration, fingerCount) {
                var nameSlid = $(this).attr('slider'),
                    $class = nameSlid.substr(1, nameSlid.length);
                if (direction=='left'){
                    nameSlid = parseInt($class, 10)+1;
                }
                if (direction=='right'){
                    nameSlid = parseInt($class, 10)-1;
                }
                scroll_el = $("#slider_pagination a:nth-child("+nameSlid+")");
                $(scroll_el).click();
            }
        });
     }
};

function highlight( items ) {
    items.addClass("active");
    animationDES();
}
function unhighlight( items ) {
    items.removeClass("active");
    animationDES();
}

function animationDES(){
    var $parent = $('.slider-item.active');
    if ($('.slider-item[slider="n2"], .slider-item[slider="n3"]').hasClass('active')){
        var $timer = 800;
        $('.images.num1',$parent).animate({
            opacity: 1,
            maxWidth: '300px'
        },$timer);
        setTimeout( function(){
            $('.images.num1',$parent).animate({
                opacity: 0,
                maxWidth: '0px',
                marginBottom: 0
            }, $timer);
            $('.images.num2',$parent).animate({
                opacity: 1,
                maxWidth: '300px'
            },$timer+($timer/2))
        },$timer*5);
        setTimeout( function(){
            $('.images.num2',$parent).animate({
                opacity: 0,
                maxWidth: '0px',
                marginBottom: 0
            }, $timer+($timer/2));
            $('.images.num3',$parent).animate({
                opacity: 1,
                maxWidth: '300px'
            },$timer*2);
        },$timer*10);
    }
    if ($('.slider-item[slider="n4"]').hasClass('active')){
        $('.icon',$parent).animate({
            top: '35px'
        },800);
        $('h1',$parent).animate({
            opacity: 1
        },500);
    }
}

(function($){
    function injector(t, splitter, klass, after) {
        var a = t.text().split(splitter), inject = '';
        if (a.length) {
            $(a).each(function(i, item) {
                inject += '<span class="'+klass+(i+1)+'">'+item+'</span>'+after;
            });
            t.empty().append(inject);
        }
    }

    var methods = {
        init : function() {
            return this.each(function() {
                injector($(this), '', 'char', '');
            });

        },

        words : function() {
            return this.each(function() {
                injector($(this), ' ', 'word', ' ');
            });

        },

        lines : function() {
            return this.each(function() {
                var r = "eefec303079ad17405c889e092e105b0";
                injector($(this).children("br").replaceWith(r).end(), r, 'line', '');
            });

        }
    };

    $.fn.lettering = function( method ) {
        // Method calling logic
        if ( method && methods[method] ) {
            return methods[ method ].apply( this, [].slice.call( arguments, 1 ));
        } else if ( method === 'letters' || ! method ) {
            return methods.init.apply( this, [].slice.call( arguments, 0 ) ); // always pass an array
        }
        $.error( 'Method ' +  method + ' does not exist on jQuery.lettering' );
        return this;
    };

})(jQuery);