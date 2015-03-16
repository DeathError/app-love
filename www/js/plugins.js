


/*!
 * jQuery Mousewheel 3.1.12
 *
 * Copyright 2014 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */



(function (factory) {
    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
        toBind = ( 'onwheel' in document || document.documentMode >= 9 ) ?
            ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
        slice  = Array.prototype.slice,
        nullLowestDeltaTimeout, lowestDelta;

    if ( $.event.fixHooks ) {
        for ( var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    var special = $.event.special.mousewheel = {
        version: '3.1.12',

        setup: function() {
            if ( this.addEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.addEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = handler;
            }
            // Store the line height and page height for this particular element
            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
        },

        teardown: function() {
            if ( this.removeEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.removeEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = null;
            }
            // Clean up the data we added to the element
            $.removeData(this, 'mousewheel-line-height');
            $.removeData(this, 'mousewheel-page-height');
        },

        getLineHeight: function(elem) {
            var $elem = $(elem),
                $parent = $elem['offsetParent' in $.fn ? 'offsetParent' : 'parent']();
            if (!$parent.length) {
                $parent = $('body');
            }
            return parseInt($parent.css('fontSize'), 10) || parseInt($elem.css('fontSize'), 10) || 16;
        },

        getPageHeight: function(elem) {
            return $(elem).height();
        },

        settings: {
            adjustOldDeltas: true, // see shouldAdjustOldDeltas() below
            normalizeOffset: true  // calls getBoundingClientRect for each event
        }
    };

    $.fn.extend({
        mousewheel: function(fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },

        unmousewheel: function(fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent   = event || window.event,
            args       = slice.call(arguments, 1),
            delta      = 0,
            deltaX     = 0,
            deltaY     = 0,
            absDelta   = 0,
            offsetX    = 0,
            offsetY    = 0;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1;      }
        if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;       }
        if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY;      }
        if ( 'wheelDeltaX' in orgEvent ) { deltaX = orgEvent.wheelDeltaX * -1; }

        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
        if ( 'axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
            deltaX = deltaY * -1;
            deltaY = 0;
        }

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ( 'deltaY' in orgEvent ) {
            deltaY = orgEvent.deltaY * -1;
            delta  = deltaY;
        }
        if ( 'deltaX' in orgEvent ) {
            deltaX = orgEvent.deltaX;
            if ( deltaY === 0 ) { delta  = deltaX * -1; }
        }

        // No change actually happened, no reason to go any further
        if ( deltaY === 0 && deltaX === 0 ) { return; }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if ( orgEvent.deltaMode === 1 ) {
            var lineHeight = $.data(this, 'mousewheel-line-height');
            delta  *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if ( orgEvent.deltaMode === 2 ) {
            var pageHeight = $.data(this, 'mousewheel-page-height');
            delta  *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max( Math.abs(deltaY), Math.abs(deltaX) );

        if ( !lowestDelta || absDelta < lowestDelta ) {
            lowestDelta = absDelta;

            // Adjust older deltas if necessary
            if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
                lowestDelta /= 40;
            }
        }

        // Adjust older deltas if necessary
        if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
            // Divide all the things by 40!
            delta  /= 40;
            deltaX /= 40;
            deltaY /= 40;
        }

        // Get a whole, normalized value for the deltas
        delta  = Math[ delta  >= 1 ? 'floor' : 'ceil' ](delta  / lowestDelta);
        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

        // Normalise offsetX and offsetY properties
        if ( special.settings.normalizeOffset && this.getBoundingClientRect ) {
            var boundingRect = this.getBoundingClientRect();
            offsetX = event.clientX - boundingRect.left;
            offsetY = event.clientY - boundingRect.top;
        }

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;
        event.offsetX = offsetX;
        event.offsetY = offsetY;
        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

}));

/* =============================================
 /*
 *	jQuery carouFredSel 6.2.1
 *	Demo's and documentation:
 *	caroufredsel.dev7studios.com
 *
 *	Copyright (c) 2013 Fred Heusschen
 *	www.frebsite.nl
 *
 *	Dual licensed under the MIT and GPL licenses.
 *	http://en.wikipedia.org/wiki/MIT_License
 *	http://en.wikipedia.org/wiki/GNU_General_Public_License
 */


(function($) {


    //	LOCAL

    if ( $.fn.carouFredSel )
    {
        return;
    }

    $.fn.caroufredsel = $.fn.carouFredSel = function(options, configs)
    {

        //	no element
        if (this.length == 0)
        {
            debug( true, 'No element found for "' + this.selector + '".' );
            return this;
        }

        //	multiple elements
        if (this.length > 1)
        {
            return this.each(function() {
                $(this).carouFredSel(options, configs);
            });
        }


        var $cfs = this,
            $tt0 = this[0],
            starting_position = false;

        if ($cfs.data('_cfs_isCarousel'))
        {
            starting_position = $cfs.triggerHandler('_cfs_triggerEvent', 'currentPosition');
            $cfs.trigger('_cfs_triggerEvent', ['destroy', true]);
        }

        var FN = {};

        FN._init = function(o, setOrig, start)
        {
            o = go_getObject($tt0, o);

            o.items = go_getItemsObject($tt0, o.items);
            o.scroll = go_getScrollObject($tt0, o.scroll);
            o.auto = go_getAutoObject($tt0, o.auto);
            o.prev = go_getPrevNextObject($tt0, o.prev);
            o.next = go_getPrevNextObject($tt0, o.next);
            o.pagination = go_getPaginationObject($tt0, o.pagination);
            o.swipe = go_getSwipeObject($tt0, o.swipe);
            o.mousewheel = go_getMousewheelObject($tt0, o.mousewheel);

            if (setOrig)
            {
                opts_orig = $.extend(true, {}, $.fn.carouFredSel.defaults, o);
            }

            opts = $.extend(true, {}, $.fn.carouFredSel.defaults, o);
            opts.d = cf_getDimensions(opts);

            crsl.direction = (opts.direction == 'up' || opts.direction == 'left') ? 'next' : 'prev';

            var	a_itm = $cfs.children(),
                avail_primary = ms_getParentSize($wrp, opts, 'width');

            if (is_true(opts.cookie))
            {
                opts.cookie = 'caroufredsel_cookie_' + conf.serialNumber;
            }

            opts.maxDimension = ms_getMaxDimension(opts, avail_primary);

            //	complement items and sizes
            opts.items = in_complementItems(opts.items, opts, a_itm, start);
            opts[opts.d['width']] = in_complementPrimarySize(opts[opts.d['width']], opts, a_itm);
            opts[opts.d['height']] = in_complementSecondarySize(opts[opts.d['height']], opts, a_itm);

            //	primary size not set for a responsive carousel
            if (opts.responsive)
            {
                if (!is_percentage(opts[opts.d['width']]))
                {
                    opts[opts.d['width']] = '100%';
                }
            }

            //	primary size is percentage
            if (is_percentage(opts[opts.d['width']]))
            {
                crsl.upDateOnWindowResize = true;
                crsl.primarySizePercentage = opts[opts.d['width']];
                opts[opts.d['width']] = ms_getPercentage(avail_primary, crsl.primarySizePercentage);
                if (!opts.items.visible)
                {
                    opts.items.visibleConf.variable = true;
                }
            }

            if (opts.responsive)
            {
                opts.usePadding = false;
                opts.padding = [0, 0, 0, 0];
                opts.align = false;
                opts.items.visibleConf.variable = false;
            }
            else
            {
                //	visible-items not set
                if (!opts.items.visible)
                {
                    opts = in_complementVisibleItems(opts, avail_primary);
                }

                //	primary size not set -> calculate it or set to "variable"
                if (!opts[opts.d['width']])
                {
                    if (!opts.items.visibleConf.variable && is_number(opts.items[opts.d['width']]) && opts.items.filter == '*')
                    {
                        opts[opts.d['width']] = opts.items.visible * opts.items[opts.d['width']];
                        opts.align = false;
                    }
                    else
                    {
                        opts[opts.d['width']] = 'variable';
                    }
                }
                //	align not set -> set to center if primary size is number
                if (is_undefined(opts.align))
                {
                    opts.align = (is_number(opts[opts.d['width']]))
                        ? 'center'
                        : false;
                }
                //	set variabe visible-items
                if (opts.items.visibleConf.variable)
                {
                    opts.items.visible = gn_getVisibleItemsNext(a_itm, opts, 0);
                }
            }

            //	set visible items by filter
            if (opts.items.filter != '*' && !opts.items.visibleConf.variable)
            {
                opts.items.visibleConf.org = opts.items.visible;
                opts.items.visible = gn_getVisibleItemsNextFilter(a_itm, opts, 0);
            }

            opts.items.visible = cf_getItemsAdjust(opts.items.visible, opts, opts.items.visibleConf.adjust, $tt0);
            opts.items.visibleConf.old = opts.items.visible;

            if (opts.responsive)
            {
                if (!opts.items.visibleConf.min)
                {
                    opts.items.visibleConf.min = opts.items.visible;
                }
                if (!opts.items.visibleConf.max)
                {
                    opts.items.visibleConf.max = opts.items.visible;
                }
                opts = in_getResponsiveValues(opts, a_itm, avail_primary);
            }
            else
            {
                opts.padding = cf_getPadding(opts.padding);

                if (opts.align == 'top')
                {
                    opts.align = 'left';
                }
                else if (opts.align == 'bottom')
                {
                    opts.align = 'right';
                }

                switch (opts.align)
                {
                    //	align: center, left or right
                    case 'center':
                    case 'left':
                    case 'right':
                        if (opts[opts.d['width']] != 'variable')
                        {
                            opts = in_getAlignPadding(opts, a_itm);
                            opts.usePadding = true;
                        }
                        break;

                    //	padding
                    default:
                        opts.align = false;
                        opts.usePadding = (
                        opts.padding[0] == 0 &&
                        opts.padding[1] == 0 &&
                        opts.padding[2] == 0 &&
                        opts.padding[3] == 0
                        ) ? false : true;
                        break;
                }
            }

            if (!is_number(opts.scroll.duration))
            {
                opts.scroll.duration = 500;
            }
            if (is_undefined(opts.scroll.items))
            {
                opts.scroll.items = (opts.responsive || opts.items.visibleConf.variable || opts.items.filter != '*')
                    ? 'visible'
                    : opts.items.visible;
            }

            opts.auto = $.extend(true, {}, opts.scroll, opts.auto);
            opts.prev = $.extend(true, {}, opts.scroll, opts.prev);
            opts.next = $.extend(true, {}, opts.scroll, opts.next);
            opts.pagination = $.extend(true, {}, opts.scroll, opts.pagination);
            //	swipe and mousewheel extend later on, per direction

            opts.auto = go_complementAutoObject($tt0, opts.auto);
            opts.prev = go_complementPrevNextObject($tt0, opts.prev);
            opts.next = go_complementPrevNextObject($tt0, opts.next);
            opts.pagination = go_complementPaginationObject($tt0, opts.pagination);
            opts.swipe = go_complementSwipeObject($tt0, opts.swipe);
            opts.mousewheel = go_complementMousewheelObject($tt0, opts.mousewheel);

            if (opts.synchronise)
            {
                opts.synchronise = cf_getSynchArr(opts.synchronise);
            }


            //	DEPRECATED
            if (opts.auto.onPauseStart)
            {
                opts.auto.onTimeoutStart = opts.auto.onPauseStart;
                deprecated('auto.onPauseStart', 'auto.onTimeoutStart');
            }
            if (opts.auto.onPausePause)
            {
                opts.auto.onTimeoutPause = opts.auto.onPausePause;
                deprecated('auto.onPausePause', 'auto.onTimeoutPause');
            }
            if (opts.auto.onPauseEnd)
            {
                opts.auto.onTimeoutEnd = opts.auto.onPauseEnd;
                deprecated('auto.onPauseEnd', 'auto.onTimeoutEnd');
            }
            if (opts.auto.pauseDuration)
            {
                opts.auto.timeoutDuration = opts.auto.pauseDuration;
                deprecated('auto.pauseDuration', 'auto.timeoutDuration');
            }
            //	/DEPRECATED


        };	//	/init


        FN._build = function() {
            $cfs.data('_cfs_isCarousel', true);

            var a_itm = $cfs.children(),
                orgCSS = in_mapCss($cfs, ['textAlign', 'float', 'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'width', 'height', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft']),
                newPosition = 'relative';

            switch (orgCSS.position)
            {
                case 'absolute':
                case 'fixed':
                    newPosition = orgCSS.position;
                    break;
            }

            if (conf.wrapper == 'parent')
            {
                sz_storeOrigCss($wrp);
            }
            else
            {
                $wrp.css(orgCSS);
            }
            $wrp.css({
                'overflow'		: 'hidden',
                'position'		: newPosition
            });

            sz_storeOrigCss($cfs);
            $cfs.data('_cfs_origCssZindex', orgCSS.zIndex);
            $cfs.css({
                'textAlign'		: 'left',
                'float'			: 'none',
                'position'		: 'absolute',
                'top'			: 0,
                'right'			: 'auto',
                'bottom'		: 'auto',
                'left'			: 0,
                'marginTop'		: 0,
                'marginRight'	: 0,
                'marginBottom'	: 0,
                'marginLeft'	: 0
            });

            sz_storeMargin(a_itm, opts);
            sz_storeOrigCss(a_itm);
            if (opts.responsive)
            {
                sz_setResponsiveSizes(opts, a_itm);
            }

        };	//	/build


        FN._bind_events = function() {
            FN._unbind_events();


            //	stop event
            $cfs.bind(cf_e('stop', conf), function(e, imm) {
                e.stopPropagation();

                //	button
                if (!crsl.isStopped)
                {
                    if (opts.auto.button)
                    {
                        opts.auto.button.addClass(cf_c('stopped', conf));
                    }
                }

                //	set stopped
                crsl.isStopped = true;

                if (opts.auto.play)
                {
                    opts.auto.play = false;
                    $cfs.trigger(cf_e('pause', conf), imm);
                }
                return true;
            });


            //	finish event
            $cfs.bind(cf_e('finish', conf), function(e) {
                e.stopPropagation();
                if (crsl.isScrolling)
                {
                    sc_stopScroll(scrl);
                }
                return true;
            });


            //	pause event
            $cfs.bind(cf_e('pause', conf), function(e, imm, res) {
                e.stopPropagation();
                tmrs = sc_clearTimers(tmrs);

                //	immediately pause
                if (imm && crsl.isScrolling)
                {
                    scrl.isStopped = true;
                    var nst = getTime() - scrl.startTime;
                    scrl.duration -= nst;
                    if (scrl.pre)
                    {
                        scrl.pre.duration -= nst;
                    }
                    if (scrl.post)
                    {
                        scrl.post.duration -= nst;
                    }
                    sc_stopScroll(scrl, false);
                }

                //	update remaining pause-time
                if (!crsl.isPaused && !crsl.isScrolling)
                {
                    if (res)
                    {
                        tmrs.timePassed += getTime() - tmrs.startTime;
                    }
                }

                //	button
                if (!crsl.isPaused)
                {
                    if (opts.auto.button)
                    {
                        opts.auto.button.addClass(cf_c('paused', conf));
                    }
                }

                //	set paused
                crsl.isPaused = true;

                //	pause pause callback
                if (opts.auto.onTimeoutPause)
                {
                    var dur1 = opts.auto.timeoutDuration - tmrs.timePassed,
                        perc = 100 - Math.ceil( dur1 * 100 / opts.auto.timeoutDuration );

                    opts.auto.onTimeoutPause.call($tt0, perc, dur1);
                }
                return true;
            });


            //	play event
            $cfs.bind(cf_e('play', conf), function(e, dir, del, res) {
                e.stopPropagation();
                tmrs = sc_clearTimers(tmrs);

                //	sort params
                var v = [dir, del, res],
                    t = ['string', 'number', 'boolean'],
                    a = cf_sortParams(v, t);

                dir = a[0];
                del = a[1];
                res = a[2];

                if (dir != 'prev' && dir != 'next')
                {
                    dir = crsl.direction;
                }
                if (!is_number(del))
                {
                    del = 0;
                }
                if (!is_boolean(res))
                {
                    res = false;
                }

                //	stopped?
                if (res)
                {
                    crsl.isStopped = false;
                    opts.auto.play = true;
                }
                if (!opts.auto.play)
                {
                    e.stopImmediatePropagation();
                    return debug(conf, 'Carousel stopped: Not scrolling.');
                }

                //	button
                if (crsl.isPaused)
                {
                    if (opts.auto.button)
                    {
                        opts.auto.button.removeClass(cf_c('stopped', conf));
                        opts.auto.button.removeClass(cf_c('paused', conf));
                    }
                }

                //	set playing
                crsl.isPaused = false;
                tmrs.startTime = getTime();

                //	timeout the scrolling
                var dur1 = opts.auto.timeoutDuration + del;
                dur2 = dur1 - tmrs.timePassed;
                perc = 100 - Math.ceil(dur2 * 100 / dur1);

                if (opts.auto.progress)
                {
                    tmrs.progress = setInterval(function() {
                        var pasd = getTime() - tmrs.startTime + tmrs.timePassed,
                            perc = Math.ceil(pasd * 100 / dur1);
                        opts.auto.progress.updater.call(opts.auto.progress.bar[0], perc);
                    }, opts.auto.progress.interval);
                }

                tmrs.auto = setTimeout(function() {
                    if (opts.auto.progress)
                    {
                        opts.auto.progress.updater.call(opts.auto.progress.bar[0], 100);
                    }
                    if (opts.auto.onTimeoutEnd)
                    {
                        opts.auto.onTimeoutEnd.call($tt0, perc, dur2);
                    }
                    if (crsl.isScrolling)
                    {
                        $cfs.trigger(cf_e('play', conf), dir);
                    }
                    else
                    {
                        $cfs.trigger(cf_e(dir, conf), opts.auto);
                    }
                }, dur2);

                //	pause start callback
                if (opts.auto.onTimeoutStart)
                {
                    opts.auto.onTimeoutStart.call($tt0, perc, dur2);
                }

                return true;
            });


            //	resume event
            $cfs.bind(cf_e('resume', conf), function(e) {
                e.stopPropagation();
                if (scrl.isStopped)
                {
                    scrl.isStopped = false;
                    crsl.isPaused = false;
                    crsl.isScrolling = true;
                    scrl.startTime = getTime();
                    sc_startScroll(scrl, conf);
                }
                else
                {
                    $cfs.trigger(cf_e('play', conf));
                }
                return true;
            });


            //	prev + next events
            $cfs.bind(cf_e('prev', conf)+' '+cf_e('next', conf), function(e, obj, num, clb, que) {
                e.stopPropagation();

                //	stopped or hidden carousel, don't scroll, don't queue
                if (crsl.isStopped || $cfs.is(':hidden'))
                {
                    e.stopImmediatePropagation();
                    return debug(conf, 'Carousel stopped or hidden: Not scrolling.');
                }

                //	not enough items
                var minimum = (is_number(opts.items.minimum)) ? opts.items.minimum : opts.items.visible + 1;
                if (minimum > itms.total)
                {
                    e.stopImmediatePropagation();
                    return debug(conf, 'Not enough items ('+itms.total+' total, '+minimum+' needed): Not scrolling.');
                }

                //	get config
                var v = [obj, num, clb, que],
                    t = ['object', 'number/string', 'function', 'boolean'],
                    a = cf_sortParams(v, t);

                obj = a[0];
                num = a[1];
                clb = a[2];
                que = a[3];

                var eType = e.type.slice(conf.events.prefix.length);

                if (!is_object(obj))
                {
                    obj = {};
                }
                if (is_function(clb))
                {
                    obj.onAfter = clb;
                }
                if (is_boolean(que))
                {
                    obj.queue = que;
                }
                obj = $.extend(true, {}, opts[eType], obj);

                //	test conditions callback
                if (obj.conditions && !obj.conditions.call($tt0, eType))
                {
                    e.stopImmediatePropagation();
                    return debug(conf, 'Callback "conditions" returned false.');
                }

                if (!is_number(num))
                {
                    if (opts.items.filter != '*')
                    {
                        num = 'visible';
                    }
                    else
                    {
                        var arr = [num, obj.items, opts[eType].items];
                        for (var a = 0, l = arr.length; a < l; a++)
                        {
                            if (is_number(arr[a]) || arr[a] == 'page' || arr[a] == 'visible') {
                                num = arr[a];
                                break;
                            }
                        }
                    }
                    switch(num) {
                        case 'page':
                            e.stopImmediatePropagation();
                            return $cfs.triggerHandler(cf_e(eType+'Page', conf), [obj, clb]);
                            break;

                        case 'visible':
                            if (!opts.items.visibleConf.variable && opts.items.filter == '*')
                            {
                                num = opts.items.visible;
                            }
                            break;
                    }
                }

                //	resume animation, add current to queue
                if (scrl.isStopped)
                {
                    $cfs.trigger(cf_e('resume', conf));
                    $cfs.trigger(cf_e('queue', conf), [eType, [obj, num, clb]]);
                    e.stopImmediatePropagation();
                    return debug(conf, 'Carousel resumed scrolling.');
                }

                //	queue if scrolling
                if (obj.duration > 0)
                {
                    if (crsl.isScrolling)
                    {
                        if (obj.queue)
                        {
                            if (obj.queue == 'last')
                            {
                                queu = [];
                            }
                            if (obj.queue != 'first' || queu.length == 0)
                            {
                                $cfs.trigger(cf_e('queue', conf), [eType, [obj, num, clb]]);
                            }
                        }
                        e.stopImmediatePropagation();
                        return debug(conf, 'Carousel currently scrolling.');
                    }
                }

                tmrs.timePassed = 0;
                $cfs.trigger(cf_e('slide_'+eType, conf), [obj, num]);

                //	synchronise
                if (opts.synchronise)
                {
                    var s = opts.synchronise,
                        c = [obj, num];

                    for (var j = 0, l = s.length; j < l; j++) {
                        var d = eType;
                        if (!s[j][2])
                        {
                            d = (d == 'prev') ? 'next' : 'prev';
                        }
                        if (!s[j][1])
                        {
                            c[0] = s[j][0].triggerHandler('_cfs_triggerEvent', ['configuration', d]);
                        }
                        c[1] = num + s[j][3];
                        s[j][0].trigger('_cfs_triggerEvent', ['slide_'+d, c]);
                    }
                }
                return true;
            });


            //	prev event
            $cfs.bind(cf_e('slide_prev', conf), function(e, sO, nI) {
                e.stopPropagation();
                var a_itm = $cfs.children();

                //	non-circular at start, scroll to end
                if (!opts.circular)
                {
                    if (itms.first == 0)
                    {
                        if (opts.infinite)
                        {
                            $cfs.trigger(cf_e('next', conf), itms.total-1);
                        }
                        return e.stopImmediatePropagation();
                    }
                }

                sz_resetMargin(a_itm, opts);

                //	find number of items to scroll
                if (!is_number(nI))
                {
                    if (opts.items.visibleConf.variable)
                    {
                        nI = gn_getVisibleItemsPrev(a_itm, opts, itms.total-1);
                    }
                    else if (opts.items.filter != '*')
                    {
                        var xI = (is_number(sO.items)) ? sO.items : gn_getVisibleOrg($cfs, opts);
                        nI = gn_getScrollItemsPrevFilter(a_itm, opts, itms.total-1, xI);
                    }
                    else
                    {
                        nI = opts.items.visible;
                    }
                    nI = cf_getAdjust(nI, opts, sO.items, $tt0);
                }

                //	prevent non-circular from scrolling to far
                if (!opts.circular)
                {
                    if (itms.total - nI < itms.first)
                    {
                        nI = itms.total - itms.first;
                    }
                }

                //	set new number of visible items
                opts.items.visibleConf.old = opts.items.visible;
                if (opts.items.visibleConf.variable)
                {
                    var vI = cf_getItemsAdjust(gn_getVisibleItemsNext(a_itm, opts, itms.total-nI), opts, opts.items.visibleConf.adjust, $tt0);
                    if (opts.items.visible+nI <= vI && nI < itms.total)
                    {
                        nI++;
                        vI = cf_getItemsAdjust(gn_getVisibleItemsNext(a_itm, opts, itms.total-nI), opts, opts.items.visibleConf.adjust, $tt0);
                    }
                    opts.items.visible = vI;
                }
                else if (opts.items.filter != '*')
                {
                    var vI = gn_getVisibleItemsNextFilter(a_itm, opts, itms.total-nI);
                    opts.items.visible = cf_getItemsAdjust(vI, opts, opts.items.visibleConf.adjust, $tt0);
                }

                sz_resetMargin(a_itm, opts, true);

                //	scroll 0, don't scroll
                if (nI == 0)
                {
                    e.stopImmediatePropagation();
                    return debug(conf, '0 items to scroll: Not scrolling.');
                }
                debug(conf, 'Scrolling '+nI+' items backward.');


                //	save new config
                itms.first += nI;
                while (itms.first >= itms.total)
                {
                    itms.first -= itms.total;
                }

                //	non-circular callback
                if (!opts.circular)
                {
                    if (itms.first == 0 && sO.onEnd)
                    {
                        sO.onEnd.call($tt0, 'prev');
                    }
                    if (!opts.infinite)
                    {
                        nv_enableNavi(opts, itms.first, conf);
                    }
                }

                //	rearrange items
                $cfs.children().slice(itms.total-nI, itms.total).prependTo($cfs);
                if (itms.total < opts.items.visible + nI)
                {
                    $cfs.children().slice(0, (opts.items.visible+nI)-itms.total).clone(true).appendTo($cfs);
                }

                //	the needed items
                var a_itm = $cfs.children(),
                    i_old = gi_getOldItemsPrev(a_itm, opts, nI),
                    i_new = gi_getNewItemsPrev(a_itm, opts),
                    i_cur_l = a_itm.eq(nI-1),
                    i_old_l = i_old.last(),
                    i_new_l = i_new.last();

                sz_resetMargin(a_itm, opts);

                var pL = 0,
                    pR = 0;

                if (opts.align)
                {
                    var p = cf_getAlignPadding(i_new, opts);
                    pL = p[0];
                    pR = p[1];
                }
                var oL = (pL < 0) ? opts.padding[opts.d[3]] : 0;

                //	hide items for fx directscroll
                var hiddenitems = false,
                    i_skp = $();
                if (opts.items.visible < nI)
                {
                    i_skp = a_itm.slice(opts.items.visibleConf.old, nI);
                    if (sO.fx == 'directscroll')
                    {
                        var orgW = opts.items[opts.d['width']];
                        hiddenitems = i_skp;
                        i_cur_l = i_new_l;
                        sc_hideHiddenItems(hiddenitems);
                        opts.items[opts.d['width']] = 'variable';
                    }
                }

                //	save new sizes
                var $cf2 = false,
                    i_siz = ms_getTotalSize(a_itm.slice(0, nI), opts, 'width'),
                    w_siz = cf_mapWrapperSizes(ms_getSizes(i_new, opts, true), opts, !opts.usePadding),
                    i_siz_vis = 0,
                    a_cfs = {},
                    a_wsz = {},
                    a_cur = {},
                    a_old = {},
                    a_new = {},
                    a_lef = {},
                    a_lef_vis = {},
                    a_dur = sc_getDuration(sO, opts, nI, i_siz);

                switch(sO.fx)
                {
                    case 'cover':
                    case 'cover-fade':
                        i_siz_vis = ms_getTotalSize(a_itm.slice(0, opts.items.visible), opts, 'width');
                        break;
                }

                if (hiddenitems)
                {
                    opts.items[opts.d['width']] = orgW;
                }

                sz_resetMargin(a_itm, opts, true);
                if (pR >= 0)
                {
                    sz_resetMargin(i_old_l, opts, opts.padding[opts.d[1]]);
                }
                if (pL >= 0)
                {
                    sz_resetMargin(i_cur_l, opts, opts.padding[opts.d[3]]);
                }

                if (opts.align)
                {
                    opts.padding[opts.d[1]] = pR;
                    opts.padding[opts.d[3]] = pL;
                }

                a_lef[opts.d['left']] = -(i_siz - oL);
                a_lef_vis[opts.d['left']] = -(i_siz_vis - oL);
                a_wsz[opts.d['left']] = w_siz[opts.d['width']];

                //	scrolling functions
                var _s_wrapper = function() {},
                    _a_wrapper = function() {},
                    _s_paddingold = function() {},
                    _a_paddingold = function() {},
                    _s_paddingnew = function() {},
                    _a_paddingnew = function() {},
                    _s_paddingcur = function() {},
                    _a_paddingcur = function() {},
                    _onafter = function() {},
                    _moveitems = function() {},
                    _position = function() {};

                //	clone carousel
                switch(sO.fx)
                {
                    case 'crossfade':
                    case 'cover':
                    case 'cover-fade':
                    case 'uncover':
                    case 'uncover-fade':
                        $cf2 = $cfs.clone(true).appendTo($wrp);
                        break;
                }
                switch(sO.fx)
                {
                    case 'crossfade':
                    case 'uncover':
                    case 'uncover-fade':
                        $cf2.children().slice(0, nI).remove();
                        $cf2.children().slice(opts.items.visibleConf.old).remove();
                        break;

                    case 'cover':
                    case 'cover-fade':
                        $cf2.children().slice(opts.items.visible).remove();
                        $cf2.css(a_lef_vis);
                        break;
                }

                $cfs.css(a_lef);

                //	reset all scrolls
                scrl = sc_setScroll(a_dur, sO.easing, conf);

                //	animate / set carousel
                a_cfs[opts.d['left']] = (opts.usePadding) ? opts.padding[opts.d[3]] : 0;

                //	animate / set wrapper
                if (opts[opts.d['width']] == 'variable' || opts[opts.d['height']] == 'variable')
                {
                    _s_wrapper = function() {
                        $wrp.css(w_siz);
                    };
                    _a_wrapper = function() {
                        scrl.anims.push([$wrp, w_siz]);
                    };
                }

                //	animate / set items
                if (opts.usePadding)
                {
                    if (i_new_l.not(i_cur_l).length)
                    {
                        a_cur[opts.d['marginRight']] = i_cur_l.data('_cfs_origCssMargin');

                        if (pL < 0)
                        {
                            i_cur_l.css(a_cur);
                        }
                        else
                        {
                            _s_paddingcur = function() {
                                i_cur_l.css(a_cur);
                            };
                            _a_paddingcur = function() {
                                scrl.anims.push([i_cur_l, a_cur]);
                            };
                        }
                    }
                    switch(sO.fx)
                    {
                        case 'cover':
                        case 'cover-fade':
                            $cf2.children().eq(nI-1).css(a_cur);
                            break;
                    }

                    if (i_new_l.not(i_old_l).length)
                    {
                        a_old[opts.d['marginRight']] = i_old_l.data('_cfs_origCssMargin');
                        _s_paddingold = function() {
                            i_old_l.css(a_old);
                        };
                        _a_paddingold = function() {
                            scrl.anims.push([i_old_l, a_old]);
                        };
                    }

                    if (pR >= 0)
                    {
                        a_new[opts.d['marginRight']] = i_new_l.data('_cfs_origCssMargin') + opts.padding[opts.d[1]];
                        _s_paddingnew = function() {
                            i_new_l.css(a_new);
                        };
                        _a_paddingnew = function() {
                            scrl.anims.push([i_new_l, a_new]);
                        };
                    }
                }

                //	set position
                _position = function() {
                    $cfs.css(a_cfs);
                };


                var overFill = opts.items.visible+nI-itms.total;

                //	rearrange items
                _moveitems = function() {
                    if (overFill > 0)
                    {
                        $cfs.children().slice(itms.total).remove();
                        i_old = $( $cfs.children().slice(itms.total-(opts.items.visible-overFill)).get().concat( $cfs.children().slice(0, overFill).get() ) );
                    }
                    sc_showHiddenItems(hiddenitems);

                    if (opts.usePadding)
                    {
                        var l_itm = $cfs.children().eq(opts.items.visible+nI-1);
                        l_itm.css(opts.d['marginRight'], l_itm.data('_cfs_origCssMargin'));
                    }
                };


                var cb_arguments = sc_mapCallbackArguments(i_old, i_skp, i_new, nI, 'prev', a_dur, w_siz);

                //	fire onAfter callbacks
                _onafter = function() {
                    sc_afterScroll($cfs, $cf2, sO);
                    crsl.isScrolling = false;
                    clbk.onAfter = sc_fireCallbacks($tt0, sO, 'onAfter', cb_arguments, clbk);
                    queu = sc_fireQueue($cfs, queu, conf);

                    if (!crsl.isPaused)
                    {
                        $cfs.trigger(cf_e('play', conf));
                    }
                };

                //	fire onBefore callback
                crsl.isScrolling = true;
                tmrs = sc_clearTimers(tmrs);
                clbk.onBefore = sc_fireCallbacks($tt0, sO, 'onBefore', cb_arguments, clbk);

                switch(sO.fx)
                {
                    case 'none':
                        $cfs.css(a_cfs);
                        _s_wrapper();
                        _s_paddingold();
                        _s_paddingnew();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        _onafter();
                        break;

                    case 'fade':
                        scrl.anims.push([$cfs, { 'opacity': 0 }, function() {
                            _s_wrapper();
                            _s_paddingold();
                            _s_paddingnew();
                            _s_paddingcur();
                            _position();
                            _moveitems();
                            scrl = sc_setScroll(a_dur, sO.easing, conf);
                            scrl.anims.push([$cfs, { 'opacity': 1 }, _onafter]);
                            sc_startScroll(scrl, conf);
                        }]);
                        break;

                    case 'crossfade':
                        $cfs.css({ 'opacity': 0 });
                        scrl.anims.push([$cf2, { 'opacity': 0 }]);
                        scrl.anims.push([$cfs, { 'opacity': 1 }, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingnew();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        break;

                    case 'cover':
                        scrl.anims.push([$cf2, a_cfs, function() {
                            _s_paddingold();
                            _s_paddingnew();
                            _s_paddingcur();
                            _position();
                            _moveitems();
                            _onafter();
                        }]);
                        _a_wrapper();
                        break;

                    case 'cover-fade':
                        scrl.anims.push([$cfs, { 'opacity': 0 }]);
                        scrl.anims.push([$cf2, a_cfs, function() {
                            _s_paddingold();
                            _s_paddingnew();
                            _s_paddingcur();
                            _position();
                            _moveitems();
                            _onafter();
                        }]);
                        _a_wrapper();
                        break;

                    case 'uncover':
                        scrl.anims.push([$cf2, a_wsz, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingnew();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        break;

                    case 'uncover-fade':
                        $cfs.css({ 'opacity': 0 });
                        scrl.anims.push([$cfs, { 'opacity': 1 }]);
                        scrl.anims.push([$cf2, a_wsz, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingnew();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        break;

                    default:
                        scrl.anims.push([$cfs, a_cfs, function() {
                            _moveitems();
                            _onafter();
                        }]);
                        _a_wrapper();
                        _a_paddingold();
                        _a_paddingnew();
                        _a_paddingcur();
                        break;
                }

                sc_startScroll(scrl, conf);
                cf_setCookie(opts.cookie, $cfs, conf);

                $cfs.trigger(cf_e('updatePageStatus', conf), [false, w_siz]);

                return true;
            });


            //	next event
            $cfs.bind(cf_e('slide_next', conf), function(e, sO, nI) {
                e.stopPropagation();
                var a_itm = $cfs.children();

                //	non-circular at end, scroll to start
                if (!opts.circular)
                {
                    if (itms.first == opts.items.visible)
                    {
                        if (opts.infinite)
                        {
                            $cfs.trigger(cf_e('prev', conf), itms.total-1);
                        }
                        return e.stopImmediatePropagation();
                    }
                }

                sz_resetMargin(a_itm, opts);

                //	find number of items to scroll
                if (!is_number(nI))
                {
                    if (opts.items.filter != '*')
                    {
                        var xI = (is_number(sO.items)) ? sO.items : gn_getVisibleOrg($cfs, opts);
                        nI = gn_getScrollItemsNextFilter(a_itm, opts, 0, xI);
                    }
                    else
                    {
                        nI = opts.items.visible;
                    }
                    nI = cf_getAdjust(nI, opts, sO.items, $tt0);
                }

                var lastItemNr = (itms.first == 0) ? itms.total : itms.first;

                //	prevent non-circular from scrolling to far
                if (!opts.circular)
                {
                    if (opts.items.visibleConf.variable)
                    {
                        var vI = gn_getVisibleItemsNext(a_itm, opts, nI),
                            xI = gn_getVisibleItemsPrev(a_itm, opts, lastItemNr-1);
                    }
                    else
                    {
                        var vI = opts.items.visible,
                            xI = opts.items.visible;
                    }

                    if (nI + vI > lastItemNr)
                    {
                        nI = lastItemNr - xI;
                    }
                }

                //	set new number of visible items
                opts.items.visibleConf.old = opts.items.visible;
                if (opts.items.visibleConf.variable)
                {
                    var vI = cf_getItemsAdjust(gn_getVisibleItemsNextTestCircular(a_itm, opts, nI, lastItemNr), opts, opts.items.visibleConf.adjust, $tt0);
                    while (opts.items.visible-nI >= vI && nI < itms.total)
                    {
                        nI++;
                        vI = cf_getItemsAdjust(gn_getVisibleItemsNextTestCircular(a_itm, opts, nI, lastItemNr), opts, opts.items.visibleConf.adjust, $tt0);
                    }
                    opts.items.visible = vI;
                }
                else if (opts.items.filter != '*')
                {
                    var vI = gn_getVisibleItemsNextFilter(a_itm, opts, nI);
                    opts.items.visible = cf_getItemsAdjust(vI, opts, opts.items.visibleConf.adjust, $tt0);
                }

                sz_resetMargin(a_itm, opts, true);

                //	scroll 0, don't scroll
                if (nI == 0)
                {
                    e.stopImmediatePropagation();
                    return debug(conf, '0 items to scroll: Not scrolling.');
                }
                debug(conf, 'Scrolling '+nI+' items forward.');


                //	save new config
                itms.first -= nI;
                while (itms.first < 0)
                {
                    itms.first += itms.total;
                }

                //	non-circular callback
                if (!opts.circular)
                {
                    if (itms.first == opts.items.visible && sO.onEnd)
                    {
                        sO.onEnd.call($tt0, 'next');
                    }
                    if (!opts.infinite)
                    {
                        nv_enableNavi(opts, itms.first, conf);
                    }
                }

                //	rearrange items
                if (itms.total < opts.items.visible+nI)
                {
                    $cfs.children().slice(0, (opts.items.visible+nI)-itms.total).clone(true).appendTo($cfs);
                }

                //	the needed items
                var a_itm = $cfs.children(),
                    i_old = gi_getOldItemsNext(a_itm, opts),
                    i_new = gi_getNewItemsNext(a_itm, opts, nI),
                    i_cur_l = a_itm.eq(nI-1),
                    i_old_l = i_old.last(),
                    i_new_l = i_new.last();

                sz_resetMargin(a_itm, opts);

                var pL = 0,
                    pR = 0;

                if (opts.align)
                {
                    var p = cf_getAlignPadding(i_new, opts);
                    pL = p[0];
                    pR = p[1];
                }

                //	hide items for fx directscroll
                var hiddenitems = false,
                    i_skp = $();
                if (opts.items.visibleConf.old < nI)
                {
                    i_skp = a_itm.slice(opts.items.visibleConf.old, nI);
                    if (sO.fx == 'directscroll')
                    {
                        var orgW = opts.items[opts.d['width']];
                        hiddenitems = i_skp;
                        i_cur_l = i_old_l;
                        sc_hideHiddenItems(hiddenitems);
                        opts.items[opts.d['width']] = 'variable';
                    }
                }

                //	save new sizes
                var $cf2 = false,
                    i_siz = ms_getTotalSize(a_itm.slice(0, nI), opts, 'width'),
                    w_siz = cf_mapWrapperSizes(ms_getSizes(i_new, opts, true), opts, !opts.usePadding),
                    i_siz_vis = 0,
                    a_cfs = {},
                    a_cfs_vis = {},
                    a_cur = {},
                    a_old = {},
                    a_lef = {},
                    a_dur = sc_getDuration(sO, opts, nI, i_siz);

                switch(sO.fx)
                {
                    case 'uncover':
                    case 'uncover-fade':
                        i_siz_vis = ms_getTotalSize(a_itm.slice(0, opts.items.visibleConf.old), opts, 'width');
                        break;
                }

                if (hiddenitems)
                {
                    opts.items[opts.d['width']] = orgW;
                }

                if (opts.align)
                {
                    if (opts.padding[opts.d[1]] < 0)
                    {
                        opts.padding[opts.d[1]] = 0;
                    }
                }
                sz_resetMargin(a_itm, opts, true);
                sz_resetMargin(i_old_l, opts, opts.padding[opts.d[1]]);

                if (opts.align)
                {
                    opts.padding[opts.d[1]] = pR;
                    opts.padding[opts.d[3]] = pL;
                }

                a_lef[opts.d['left']] = (opts.usePadding) ? opts.padding[opts.d[3]] : 0;

                //	scrolling functions
                var _s_wrapper = function() {},
                    _a_wrapper = function() {},
                    _s_paddingold = function() {},
                    _a_paddingold = function() {},
                    _s_paddingcur = function() {},
                    _a_paddingcur = function() {},
                    _onafter = function() {},
                    _moveitems = function() {},
                    _position = function() {};

                //	clone carousel
                switch(sO.fx)
                {
                    case 'crossfade':
                    case 'cover':
                    case 'cover-fade':
                    case 'uncover':
                    case 'uncover-fade':
                        $cf2 = $cfs.clone(true).appendTo($wrp);
                        $cf2.children().slice(opts.items.visibleConf.old).remove();
                        break;
                }
                switch(sO.fx)
                {
                    case 'crossfade':
                    case 'cover':
                    case 'cover-fade':
                        $cfs.css('zIndex', 1);
                        $cf2.css('zIndex', 0);
                        break;
                }

                //	reset all scrolls
                scrl = sc_setScroll(a_dur, sO.easing, conf);

                //	animate / set carousel
                a_cfs[opts.d['left']] = -i_siz;
                a_cfs_vis[opts.d['left']] = -i_siz_vis;

                if (pL < 0)
                {
                    a_cfs[opts.d['left']] += pL;
                }

                //	animate / set wrapper
                if (opts[opts.d['width']] == 'variable' || opts[opts.d['height']] == 'variable')
                {
                    _s_wrapper = function() {
                        $wrp.css(w_siz);
                    };
                    _a_wrapper = function() {
                        scrl.anims.push([$wrp, w_siz]);
                    };
                }

                //	animate / set items
                if (opts.usePadding)
                {
                    var i_new_l_m = i_new_l.data('_cfs_origCssMargin');

                    if (pR >= 0)
                    {
                        i_new_l_m += opts.padding[opts.d[1]];
                    }
                    i_new_l.css(opts.d['marginRight'], i_new_l_m);

                    if (i_cur_l.not(i_old_l).length)
                    {
                        a_old[opts.d['marginRight']] = i_old_l.data('_cfs_origCssMargin');
                    }
                    _s_paddingold = function() {
                        i_old_l.css(a_old);
                    };
                    _a_paddingold = function() {
                        scrl.anims.push([i_old_l, a_old]);
                    };

                    var i_cur_l_m = i_cur_l.data('_cfs_origCssMargin');
                    if (pL > 0)
                    {
                        i_cur_l_m += opts.padding[opts.d[3]];
                    }

                    a_cur[opts.d['marginRight']] = i_cur_l_m;

                    _s_paddingcur = function() {
                        i_cur_l.css(a_cur);
                    };
                    _a_paddingcur = function() {
                        scrl.anims.push([i_cur_l, a_cur]);
                    };
                }

                //	set position
                _position = function() {
                    $cfs.css(a_lef);
                };


                var overFill = opts.items.visible+nI-itms.total;

                //	rearrange items
                _moveitems = function() {
                    if (overFill > 0)
                    {
                        $cfs.children().slice(itms.total).remove();
                    }
                    var l_itm = $cfs.children().slice(0, nI).appendTo($cfs).last();
                    if (overFill > 0)
                    {
                        i_new = gi_getCurrentItems(a_itm, opts);
                    }
                    sc_showHiddenItems(hiddenitems);

                    if (opts.usePadding)
                    {
                        if (itms.total < opts.items.visible+nI) {
                            var i_cur_l = $cfs.children().eq(opts.items.visible-1);
                            i_cur_l.css(opts.d['marginRight'], i_cur_l.data('_cfs_origCssMargin') + opts.padding[opts.d[1]]);
                        }
                        l_itm.css(opts.d['marginRight'], l_itm.data('_cfs_origCssMargin'));
                    }
                };


                var cb_arguments = sc_mapCallbackArguments(i_old, i_skp, i_new, nI, 'next', a_dur, w_siz);

                //	fire onAfter callbacks
                _onafter = function() {
                    $cfs.css('zIndex', $cfs.data('_cfs_origCssZindex'));
                    sc_afterScroll($cfs, $cf2, sO);
                    crsl.isScrolling = false;
                    clbk.onAfter = sc_fireCallbacks($tt0, sO, 'onAfter', cb_arguments, clbk);
                    queu = sc_fireQueue($cfs, queu, conf);

                    if (!crsl.isPaused)
                    {
                        $cfs.trigger(cf_e('play', conf));
                    }
                };

                //	fire onBefore callbacks
                crsl.isScrolling = true;
                tmrs = sc_clearTimers(tmrs);
                clbk.onBefore = sc_fireCallbacks($tt0, sO, 'onBefore', cb_arguments, clbk);

                switch(sO.fx)
                {
                    case 'none':
                        $cfs.css(a_cfs);
                        _s_wrapper();
                        _s_paddingold();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        _onafter();
                        break;

                    case 'fade':
                        scrl.anims.push([$cfs, { 'opacity': 0 }, function() {
                            _s_wrapper();
                            _s_paddingold();
                            _s_paddingcur();
                            _position();
                            _moveitems();
                            scrl = sc_setScroll(a_dur, sO.easing, conf);
                            scrl.anims.push([$cfs, { 'opacity': 1 }, _onafter]);
                            sc_startScroll(scrl, conf);
                        }]);
                        break;

                    case 'crossfade':
                        $cfs.css({ 'opacity': 0 });
                        scrl.anims.push([$cf2, { 'opacity': 0 }]);
                        scrl.anims.push([$cfs, { 'opacity': 1 }, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        break;

                    case 'cover':
                        $cfs.css(opts.d['left'], $wrp[opts.d['width']]());
                        scrl.anims.push([$cfs, a_lef, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingcur();
                        _moveitems();
                        break;

                    case 'cover-fade':
                        $cfs.css(opts.d['left'], $wrp[opts.d['width']]());
                        scrl.anims.push([$cf2, { 'opacity': 0 }]);
                        scrl.anims.push([$cfs, a_lef, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingcur();
                        _moveitems();
                        break;

                    case 'uncover':
                        scrl.anims.push([$cf2, a_cfs_vis, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        break;

                    case 'uncover-fade':
                        $cfs.css({ 'opacity': 0 });
                        scrl.anims.push([$cfs, { 'opacity': 1 }]);
                        scrl.anims.push([$cf2, a_cfs_vis, _onafter]);
                        _a_wrapper();
                        _s_paddingold();
                        _s_paddingcur();
                        _position();
                        _moveitems();
                        break;

                    default:
                        scrl.anims.push([$cfs, a_cfs, function() {
                            _position();
                            _moveitems();
                            _onafter();
                        }]);
                        _a_wrapper();
                        _a_paddingold();
                        _a_paddingcur();
                        break;
                }

                sc_startScroll(scrl, conf);
                cf_setCookie(opts.cookie, $cfs, conf);

                $cfs.trigger(cf_e('updatePageStatus', conf), [false, w_siz]);

                return true;
            });


            //	slideTo event
            $cfs.bind(cf_e('slideTo', conf), function(e, num, dev, org, obj, dir, clb) {
                e.stopPropagation();

                var v = [num, dev, org, obj, dir, clb],
                    t = ['string/number/object', 'number', 'boolean', 'object', 'string', 'function'],
                    a = cf_sortParams(v, t);

                obj = a[3];
                dir = a[4];
                clb = a[5];

                num = gn_getItemIndex(a[0], a[1], a[2], itms, $cfs);

                if (num == 0)
                {
                    return false;
                }
                if (!is_object(obj))
                {
                    obj = false;
                }

                if (dir != 'prev' && dir != 'next')
                {
                    if (opts.circular)
                    {
                        dir = (num <= itms.total / 2) ? 'next' : 'prev';
                    }
                    else
                    {
                        dir = (itms.first == 0 || itms.first > num) ? 'next' : 'prev';
                    }
                }

                if (dir == 'prev')
                {
                    num = itms.total-num;
                }
                $cfs.trigger(cf_e(dir, conf), [obj, num, clb]);

                return true;
            });


            //	prevPage event
            $cfs.bind(cf_e('prevPage', conf), function(e, obj, clb) {
                e.stopPropagation();
                var cur = $cfs.triggerHandler(cf_e('currentPage', conf));
                return $cfs.triggerHandler(cf_e('slideToPage', conf), [cur-1, obj, 'prev', clb]);
            });


            //	nextPage event
            $cfs.bind(cf_e('nextPage', conf), function(e, obj, clb) {
                e.stopPropagation();
                var cur = $cfs.triggerHandler(cf_e('currentPage', conf));
                return $cfs.triggerHandler(cf_e('slideToPage', conf), [cur+1, obj, 'next', clb]);
            });


            //	slideToPage event
            $cfs.bind(cf_e('slideToPage', conf), function(e, pag, obj, dir, clb) {
                e.stopPropagation();
                if (!is_number(pag))
                {
                    pag = $cfs.triggerHandler(cf_e('currentPage', conf));
                }
                var ipp = opts.pagination.items || opts.items.visible,
                    max = Math.ceil(itms.total / ipp)-1;

                if (pag < 0)
                {
                    pag = max;
                }
                if (pag > max)
                {
                    pag = 0;
                }
                return $cfs.triggerHandler(cf_e('slideTo', conf), [pag*ipp, 0, true, obj, dir, clb]);
            });

            //	jumpToStart event
            $cfs.bind(cf_e('jumpToStart', conf), function(e, s) {
                e.stopPropagation();
                if (s)
                {
                    s = gn_getItemIndex(s, 0, true, itms, $cfs);
                }
                else
                {
                    s = 0;
                }

                s += itms.first;
                if (s != 0)
                {
                    if (itms.total > 0)
                    {
                        while (s > itms.total)
                        {
                            s -= itms.total;
                        }
                    }
                    $cfs.prepend($cfs.children().slice(s, itms.total));
                }
                return true;
            });


            //	synchronise event
            $cfs.bind(cf_e('synchronise', conf), function(e, s) {
                e.stopPropagation();
                if (s)
                {
                    s = cf_getSynchArr(s);
                }
                else if (opts.synchronise)
                {
                    s = opts.synchronise;
                }
                else
                {
                    return debug(conf, 'No carousel to synchronise.');
                }

                var n = $cfs.triggerHandler(cf_e('currentPosition', conf)),
                    x = true;

                for (var j = 0, l = s.length; j < l; j++)
                {
                    if (!s[j][0].triggerHandler(cf_e('slideTo', conf), [n, s[j][3], true]))
                    {
                        x = false;
                    }
                }
                return x;
            });


            //	queue event
            $cfs.bind(cf_e('queue', conf), function(e, dir, opt) {
                e.stopPropagation();
                if (is_function(dir))
                {
                    dir.call($tt0, queu);
                }
                else if (is_array(dir))
                {
                    queu = dir;
                }
                else if (!is_undefined(dir))
                {
                    queu.push([dir, opt]);
                }
                return queu;
            });


            //	insertItem event
            $cfs.bind(cf_e('insertItem', conf), function(e, itm, num, org, dev) {
                e.stopPropagation();

                var v = [itm, num, org, dev],
                    t = ['string/object', 'string/number/object', 'boolean', 'number'],
                    a = cf_sortParams(v, t);

                itm = a[0];
                num = a[1];
                org = a[2];
                dev = a[3];

                if (is_object(itm) && !is_jquery(itm))
                {
                    itm = $(itm);
                }
                else if (is_string(itm))
                {
                    itm = $(itm);
                }
                if (!is_jquery(itm) || itm.length == 0)
                {
                    return debug(conf, 'Not a valid object.');
                }

                if (is_undefined(num))
                {
                    num = 'end';
                }

                sz_storeMargin(itm, opts);
                sz_storeOrigCss(itm);

                var orgNum = num,
                    before = 'before';

                if (num == 'end')
                {
                    if (org)
                    {
                        if (itms.first == 0)
                        {
                            num = itms.total-1;
                            before = 'after';
                        }
                        else
                        {
                            num = itms.first;
                            itms.first += itm.length;
                        }
                        if (num < 0)
                        {
                            num = 0;
                        }
                    }
                    else
                    {
                        num = itms.total-1;
                        before = 'after';
                    }
                }
                else
                {
                    num = gn_getItemIndex(num, dev, org, itms, $cfs);
                }

                var $cit = $cfs.children().eq(num);
                if ($cit.length)
                {
                    $cit[before](itm);
                }
                else
                {
                    debug(conf, 'Correct insert-position not found! Appending item to the end.');
                    $cfs.append(itm);
                }

                if (orgNum != 'end' && !org)
                {
                    if (num < itms.first)
                    {
                        itms.first += itm.length;
                    }
                }
                itms.total = $cfs.children().length;
                if (itms.first >= itms.total)
                {
                    itms.first -= itms.total;
                }

                $cfs.trigger(cf_e('updateSizes', conf));
                $cfs.trigger(cf_e('linkAnchors', conf));

                return true;
            });


            //	removeItem event
            $cfs.bind(cf_e('removeItem', conf), function(e, num, org, dev) {
                e.stopPropagation();

                var v = [num, org, dev],
                    t = ['string/number/object', 'boolean', 'number'],
                    a = cf_sortParams(v, t);

                num = a[0];
                org = a[1];
                dev = a[2];

                var removed = false;

                if (num instanceof $ && num.length > 1)
                {
                    $removed = $();
                    num.each(function(i, el) {
                        var $rem = $cfs.trigger(cf_e('removeItem', conf), [$(this), org, dev]);
                        if ( $rem )
                        {
                            $removed = $removed.add($rem);
                        }
                    });
                    return $removed;
                }

                if (is_undefined(num) || num == 'end')
                {
                    $removed = $cfs.children().last();
                }
                else
                {
                    num = gn_getItemIndex(num, dev, org, itms, $cfs);
                    var $removed = $cfs.children().eq(num);
                    if ( $removed.length )
                    {
                        if (num < itms.first)
                        {
                            itms.first -= $removed.length;
                        }
                    }
                }
                if ( $removed && $removed.length )
                {
                    $removed.detach();
                    itms.total = $cfs.children().length;
                    $cfs.trigger(cf_e('updateSizes', conf));
                }

                return $removed;
            });


            //	onBefore and onAfter event
            $cfs.bind(cf_e('onBefore', conf)+' '+cf_e('onAfter', conf), function(e, fn) {
                e.stopPropagation();
                var eType = e.type.slice(conf.events.prefix.length);
                if (is_array(fn))
                {
                    clbk[eType] = fn;
                }
                if (is_function(fn))
                {
                    clbk[eType].push(fn);
                }
                return clbk[eType];
            });


            //	currentPosition event
            $cfs.bind(cf_e('currentPosition', conf), function(e, fn) {
                e.stopPropagation();
                if (itms.first == 0)
                {
                    var val = 0;
                }
                else
                {
                    var val = itms.total - itms.first;
                }
                if (is_function(fn))
                {
                    fn.call($tt0, val);
                }
                return val;
            });


            //	currentPage event
            $cfs.bind(cf_e('currentPage', conf), function(e, fn) {
                e.stopPropagation();
                var ipp = opts.pagination.items || opts.items.visible,
                    max = Math.ceil(itms.total/ipp-1),
                    nr;
                if (itms.first == 0)
                {
                    nr = 0;
                }
                else if (itms.first < itms.total % ipp)
                {
                    nr = 0;
                }
                else if (itms.first == ipp && !opts.circular)
                {
                    nr = max;
                }
                else
                {
                    nr = Math.round((itms.total-itms.first)/ipp);
                }
                if (nr < 0)
                {
                    nr = 0;
                }
                if (nr > max)
                {
                    nr = max;
                }
                if (is_function(fn))
                {
                    fn.call($tt0, nr);
                }
                return nr;
            });


            //	currentVisible event
            $cfs.bind(cf_e('currentVisible', conf), function(e, fn) {
                e.stopPropagation();
                var $i = gi_getCurrentItems($cfs.children(), opts);
                if (is_function(fn))
                {
                    fn.call($tt0, $i);
                }
                return $i;
            });


            //	slice event
            $cfs.bind(cf_e('slice', conf), function(e, f, l, fn) {
                e.stopPropagation();

                if (itms.total == 0)
                {
                    return false;
                }

                var v = [f, l, fn],
                    t = ['number', 'number', 'function'],
                    a = cf_sortParams(v, t);

                f = (is_number(a[0])) ? a[0] : 0;
                l = (is_number(a[1])) ? a[1] : itms.total;
                fn = a[2];

                f += itms.first;
                l += itms.first;

                if (items.total > 0)
                {
                    while (f > itms.total)
                    {
                        f -= itms.total;
                    }
                    while (l > itms.total)
                    {
                        l -= itms.total;
                    }
                    while (f < 0)
                    {
                        f += itms.total;
                    }
                    while (l < 0)
                    {
                        l += itms.total;
                    }
                }
                var $iA = $cfs.children(),
                    $i;

                if (l > f)
                {
                    $i = $iA.slice(f, l);
                }
                else
                {
                    $i = $( $iA.slice(f, itms.total).get().concat( $iA.slice(0, l).get() ) );
                }

                if (is_function(fn))
                {
                    fn.call($tt0, $i);
                }
                return $i;
            });


            //	isPaused, isStopped and isScrolling events
            $cfs.bind(cf_e('isPaused', conf)+' '+cf_e('isStopped', conf)+' '+cf_e('isScrolling', conf), function(e, fn) {
                e.stopPropagation();
                var eType = e.type.slice(conf.events.prefix.length),
                    value = crsl[eType];
                if (is_function(fn))
                {
                    fn.call($tt0, value);
                }
                return value;
            });


            //	configuration event
            $cfs.bind(cf_e('configuration', conf), function(e, a, b, c) {
                e.stopPropagation();
                var reInit = false;

                //	return entire configuration-object
                if (is_function(a))
                {
                    a.call($tt0, opts);
                }
                //	set multiple options via object
                else if (is_object(a))
                {
                    opts_orig = $.extend(true, {}, opts_orig, a);
                    if (b !== false) reInit = true;
                    else opts = $.extend(true, {}, opts, a);

                }
                else if (!is_undefined(a))
                {

                    //	callback function for specific option
                    if (is_function(b))
                    {
                        var val = eval('opts.'+a);
                        if (is_undefined(val))
                        {
                            val = '';
                        }
                        b.call($tt0, val);
                    }
                    //	set individual option
                    else if (!is_undefined(b))
                    {
                        if (typeof c !== 'boolean') c = true;
                        eval('opts_orig.'+a+' = b');
                        if (c !== false) reInit = true;
                        else eval('opts.'+a+' = b');
                    }
                    //	return value for specific option
                    else
                    {
                        return eval('opts.'+a);
                    }
                }
                if (reInit)
                {
                    sz_resetMargin($cfs.children(), opts);
                    FN._init(opts_orig);
                    FN._bind_buttons();
                    var sz = sz_setSizes($cfs, opts);
                    $cfs.trigger(cf_e('updatePageStatus', conf), [true, sz]);
                }
                return opts;
            });


            //	linkAnchors event
            $cfs.bind(cf_e('linkAnchors', conf), function(e, $con, sel) {
                e.stopPropagation();

                if (is_undefined($con))
                {
                    $con = $('body');
                }
                else if (is_string($con))
                {
                    $con = $($con);
                }
                if (!is_jquery($con) || $con.length == 0)
                {
                    return debug(conf, 'Not a valid object.');
                }
                if (!is_string(sel))
                {
                    sel = 'a.caroufredsel';
                }

                $con.find(sel).each(function() {
                    var h = this.hash || '';
                    if (h.length > 0 && $cfs.children().index($(h)) != -1)
                    {
                        $(this).unbind('click').click(function(e) {
                            e.preventDefault();
                            $cfs.trigger(cf_e('slideTo', conf), h);
                        });
                    }
                });
                return true;
            });


            //	updatePageStatus event
            $cfs.bind(cf_e('updatePageStatus', conf), function(e, build, sizes) {
                e.stopPropagation();
                if (!opts.pagination.container)
                {
                    return;
                }

                var ipp = opts.pagination.items || opts.items.visible,
                    pgs = Math.ceil(itms.total/ipp);

                if (build)
                {
                    if (opts.pagination.anchorBuilder)
                    {
                        opts.pagination.container.children().remove();
                        opts.pagination.container.each(function() {
                            for (var a = 0; a < pgs; a++)
                            {
                                var i = $cfs.children().eq( gn_getItemIndex(a*ipp, 0, true, itms, $cfs) );
                                $(this).append(opts.pagination.anchorBuilder.call(i[0], a+1));
                            }
                        });
                    }
                    opts.pagination.container.each(function() {
                        $(this).children().unbind(opts.pagination.event).each(function(a) {
                            $(this).bind(opts.pagination.event, function(e) {
                                e.preventDefault();
                                $cfs.trigger(cf_e('slideTo', conf), [a*ipp, -opts.pagination.deviation, true, opts.pagination]);
                            });
                        });
                    });
                }

                var selected = $cfs.triggerHandler(cf_e('currentPage', conf)) + opts.pagination.deviation;
                if (selected >= pgs)
                {
                    selected = 0;
                }
                if (selected < 0)
                {
                    selected = pgs-1;
                }
                opts.pagination.container.each(function() {
                    $(this).children().removeClass(cf_c('selected', conf)).eq(selected).addClass(cf_c('selected', conf));
                });
                return true;
            });


            //	updateSizes event
            $cfs.bind(cf_e('updateSizes', conf), function(e) {
                var vI = opts.items.visible,
                    a_itm = $cfs.children(),
                    avail_primary = ms_getParentSize($wrp, opts, 'width');

                itms.total = a_itm.length;

                if (crsl.primarySizePercentage)
                {
                    opts.maxDimension = avail_primary;
                    opts[opts.d['width']] = ms_getPercentage(avail_primary, crsl.primarySizePercentage);
                }
                else
                {
                    opts.maxDimension = ms_getMaxDimension(opts, avail_primary);
                }

                if (opts.responsive)
                {
                    opts.items.width = opts.items.sizesConf.width;
                    opts.items.height = opts.items.sizesConf.height;
                    opts = in_getResponsiveValues(opts, a_itm, avail_primary);
                    vI = opts.items.visible;
                    sz_setResponsiveSizes(opts, a_itm);
                }
                else if (opts.items.visibleConf.variable)
                {
                    vI = gn_getVisibleItemsNext(a_itm, opts, 0);
                }
                else if (opts.items.filter != '*')
                {
                    vI = gn_getVisibleItemsNextFilter(a_itm, opts, 0);
                }

                if (!opts.circular && itms.first != 0 && vI > itms.first) {
                    if (opts.items.visibleConf.variable)
                    {
                        var nI = gn_getVisibleItemsPrev(a_itm, opts, itms.first) - itms.first;
                    }
                    else if (opts.items.filter != '*')
                    {
                        var nI = gn_getVisibleItemsPrevFilter(a_itm, opts, itms.first) - itms.first;
                    }
                    else
                    {
                        var nI = opts.items.visible - itms.first;
                    }
                    debug(conf, 'Preventing non-circular: sliding '+nI+' items backward.');
                    $cfs.trigger(cf_e('prev', conf), nI);
                }

                opts.items.visible = cf_getItemsAdjust(vI, opts, opts.items.visibleConf.adjust, $tt0);
                opts.items.visibleConf.old = opts.items.visible;
                opts = in_getAlignPadding(opts, a_itm);

                var sz = sz_setSizes($cfs, opts);
                $cfs.trigger(cf_e('updatePageStatus', conf), [true, sz]);
                nv_showNavi(opts, itms.total, conf);
                nv_enableNavi(opts, itms.first, conf);

                return sz;
            });


            //	destroy event
            $cfs.bind(cf_e('destroy', conf), function(e, orgOrder) {
                e.stopPropagation();
                tmrs = sc_clearTimers(tmrs);

                $cfs.data('_cfs_isCarousel', false);
                $cfs.trigger(cf_e('finish', conf));
                if (orgOrder)
                {
                    $cfs.trigger(cf_e('jumpToStart', conf));
                }
                sz_restoreOrigCss($cfs.children());
                sz_restoreOrigCss($cfs);
                FN._unbind_events();
                FN._unbind_buttons();
                if (conf.wrapper == 'parent')
                {
                    sz_restoreOrigCss($wrp);
                }
                else
                {
                    $wrp.replaceWith($cfs);
                }

                return true;
            });


            //	debug event
            $cfs.bind(cf_e('debug', conf), function(e) {
                debug(conf, 'Carousel width: ' + opts.width);
                debug(conf, 'Carousel height: ' + opts.height);
                debug(conf, 'Item widths: ' + opts.items.width);
                debug(conf, 'Item heights: ' + opts.items.height);
                debug(conf, 'Number of items visible: ' + opts.items.visible);
                if (opts.auto.play)
                {
                    debug(conf, 'Number of items scrolled automatically: ' + opts.auto.items);
                }
                if (opts.prev.button)
                {
                    debug(conf, 'Number of items scrolled backward: ' + opts.prev.items);
                }
                if (opts.next.button)
                {
                    debug(conf, 'Number of items scrolled forward: ' + opts.next.items);
                }
                return conf.debug;
            });


            //	triggerEvent, making prefixed and namespaced events accessible from outside
            $cfs.bind('_cfs_triggerEvent', function(e, n, o) {
                e.stopPropagation();
                return $cfs.triggerHandler(cf_e(n, conf), o);
            });
        };	//	/bind_events


        FN._unbind_events = function() {
            $cfs.unbind(cf_e('', conf));
            $cfs.unbind(cf_e('', conf, false));
            $cfs.unbind('_cfs_triggerEvent');
        };	//	/unbind_events


        FN._bind_buttons = function() {
            FN._unbind_buttons();
            nv_showNavi(opts, itms.total, conf);
            nv_enableNavi(opts, itms.first, conf);

            if (opts.auto.pauseOnHover)
            {
                var pC = bt_pauseOnHoverConfig(opts.auto.pauseOnHover);
                $wrp.bind(cf_e('mouseenter', conf, false), function() { $cfs.trigger(cf_e('pause', conf), pC);	})
                    .bind(cf_e('mouseleave', conf, false), function() { $cfs.trigger(cf_e('resume', conf));		});
            }

            //	play button
            if (opts.auto.button)
            {
                opts.auto.button.bind(cf_e(opts.auto.event, conf, false), function(e) {
                    e.preventDefault();
                    var ev = false,
                        pC = null;

                    if (crsl.isPaused)
                    {
                        ev = 'play';
                    }
                    else if (opts.auto.pauseOnEvent)
                    {
                        ev = 'pause';
                        pC = bt_pauseOnHoverConfig(opts.auto.pauseOnEvent);
                    }
                    if (ev)
                    {
                        $cfs.trigger(cf_e(ev, conf), pC);
                    }
                });
            }

            //	prev button
            if (opts.prev.button)
            {
                opts.prev.button.bind(cf_e(opts.prev.event, conf, false), function(e) {
                    e.preventDefault();
                    $cfs.trigger(cf_e('prev', conf));
                });
                if (opts.prev.pauseOnHover)
                {
                    var pC = bt_pauseOnHoverConfig(opts.prev.pauseOnHover);
                    opts.prev.button.bind(cf_e('mouseenter', conf, false), function() { $cfs.trigger(cf_e('pause', conf), pC);	})
                        .bind(cf_e('mouseleave', conf, false), function() { $cfs.trigger(cf_e('resume', conf));		});
                }
            }

            //	next butotn
            if (opts.next.button)
            {
                opts.next.button.bind(cf_e(opts.next.event, conf, false), function(e) {
                    e.preventDefault();
                    $cfs.trigger(cf_e('next', conf));
                });
                if (opts.next.pauseOnHover)
                {
                    var pC = bt_pauseOnHoverConfig(opts.next.pauseOnHover);
                    opts.next.button.bind(cf_e('mouseenter', conf, false), function() { $cfs.trigger(cf_e('pause', conf), pC); 	})
                        .bind(cf_e('mouseleave', conf, false), function() { $cfs.trigger(cf_e('resume', conf));		});
                }
            }

            //	pagination
            if (opts.pagination.container)
            {
                if (opts.pagination.pauseOnHover)
                {
                    var pC = bt_pauseOnHoverConfig(opts.pagination.pauseOnHover);
                    opts.pagination.container.bind(cf_e('mouseenter', conf, false), function() { $cfs.trigger(cf_e('pause', conf), pC);	})
                        .bind(cf_e('mouseleave', conf, false), function() { $cfs.trigger(cf_e('resume', conf));	});
                }
            }

            //	prev/next keys
            if (opts.prev.key || opts.next.key)
            {
                $(document).bind(cf_e('keyup', conf, false, true, true), function(e) {
                    var k = e.keyCode;
                    if (k == opts.next.key)
                    {
                        e.preventDefault();
                        $cfs.trigger(cf_e('next', conf));
                    }
                    if (k == opts.prev.key)
                    {
                        e.preventDefault();
                        $cfs.trigger(cf_e('prev', conf));
                    }
                });
            }

            //	pagination keys
            if (opts.pagination.keys)
            {
                $(document).bind(cf_e('keyup', conf, false, true, true), function(e) {
                    var k = e.keyCode;
                    if (k >= 49 && k < 58)
                    {
                        k = (k-49) * opts.items.visible;
                        if (k <= itms.total)
                        {
                            e.preventDefault();
                            $cfs.trigger(cf_e('slideTo', conf), [k, 0, true, opts.pagination]);
                        }
                    }
                });
            }

            //	swipe
            if ($.fn.swipe)
            {
                var isTouch = 'ontouchstart' in window;
                if ((isTouch && opts.swipe.onTouch) || (!isTouch && opts.swipe.onMouse))
                {
                    var scP = $.extend(true, {}, opts.prev, opts.swipe),
                        scN = $.extend(true, {}, opts.next, opts.swipe),
                        swP = function() { $cfs.trigger(cf_e('prev', conf), [scP]) },
                        swN = function() { $cfs.trigger(cf_e('next', conf), [scN]) };

                    switch (opts.direction)
                    {
                        case 'up':
                        case 'down':
                            opts.swipe.options.swipeUp = swN;
                            opts.swipe.options.swipeDown = swP;
                            break;
                        default:
                            opts.swipe.options.swipeLeft = swN;
                            opts.swipe.options.swipeRight = swP;
                    }
                    if (crsl.swipe)
                    {
                        $cfs.swipe('destroy');
                    }
                    $wrp.swipe(opts.swipe.options);
                    $wrp.css('cursor', 'move');
                    crsl.swipe = true;
                }
            }

            //	mousewheel
            if ($.fn.mousewheel)
            {

                if (opts.mousewheel)
                {
                    var mcP = $.extend(true, {}, opts.prev, opts.mousewheel),
                        mcN = $.extend(true, {}, opts.next, opts.mousewheel);

                    if (crsl.mousewheel)
                    {
                        $wrp.unbind(cf_e('mousewheel', conf, false));
                    }
                    $wrp.bind(cf_e('mousewheel', conf, false), function(e, delta) {
                        e.preventDefault();
                        if (delta > 0)
                        {
                            $cfs.trigger(cf_e('prev', conf), [mcP]);
                        }
                        else
                        {
                            $cfs.trigger(cf_e('next', conf), [mcN]);
                        }
                    });
                    crsl.mousewheel = true;
                }
            }

            if (opts.auto.play)
            {
                $cfs.trigger(cf_e('play', conf), opts.auto.delay);
            }

            if (crsl.upDateOnWindowResize)
            {
                var resizeFn = function(e) {
                    $cfs.trigger(cf_e('finish', conf));
                    if (opts.auto.pauseOnResize && !crsl.isPaused)
                    {
                        $cfs.trigger(cf_e('play', conf));
                    }
                    sz_resetMargin($cfs.children(), opts);
                    $cfs.trigger(cf_e('updateSizes', conf));
                };

                var $w = $(window),
                    onResize = null;

                if ($.debounce && conf.onWindowResize == 'debounce')
                {
                    onResize = $.debounce(200, resizeFn);
                }
                else if ($.throttle && conf.onWindowResize == 'throttle')
                {
                    onResize = $.throttle(300, resizeFn);
                }
                else
                {
                    var _windowWidth = 0,
                        _windowHeight = 0;

                    onResize = function() {
                        var nw = $w.width(),
                            nh = $w.height();

                        if (nw != _windowWidth || nh != _windowHeight)
                        {
                            resizeFn();
                            _windowWidth = nw;
                            _windowHeight = nh;
                        }
                    };
                }
                $w.bind(cf_e('resize', conf, false, true, true), onResize);
            }
        };	//	/bind_buttons


        FN._unbind_buttons = function() {
            var ns1 = cf_e('', conf),
                ns2 = cf_e('', conf, false);
            ns3 = cf_e('', conf, false, true, true);

            $(document).unbind(ns3);
            $(window).unbind(ns3);
            $wrp.unbind(ns2);

            if (opts.auto.button)
            {
                opts.auto.button.unbind(ns2);
            }
            if (opts.prev.button)
            {
                opts.prev.button.unbind(ns2);
            }
            if (opts.next.button)
            {
                opts.next.button.unbind(ns2);
            }
            if (opts.pagination.container)
            {
                opts.pagination.container.unbind(ns2);
                if (opts.pagination.anchorBuilder)
                {
                    opts.pagination.container.children().remove();
                }
            }
            if (crsl.swipe)
            {
                $cfs.swipe('destroy');
                $wrp.css('cursor', 'default');
                crsl.swipe = false;
            }
            if (crsl.mousewheel)
            {
                crsl.mousewheel = false;
            }

            nv_showNavi(opts, 'hide', conf);
            nv_enableNavi(opts, 'removeClass', conf);

        };	//	/unbind_buttons



        //	START

        if (is_boolean(configs))
        {
            configs = {
                'debug': configs
            };
        }

        //	set vars
        var crsl = {
                'direction'		: 'next',
                'isPaused'		: true,
                'isScrolling'	: false,
                'isStopped'		: false,
                'mousewheel'	: false,
                'swipe'			: false
            },
            itms = {
                'total'			: $cfs.children().length,
                'first'			: 0
            },
            tmrs = {
                'auto'			: null,
                'progress'		: null,
                'startTime'		: getTime(),
                'timePassed'	: 0
            },
            scrl = {
                'isStopped'		: false,
                'duration'		: 0,
                'startTime'		: 0,
                'easing'		: '',
                'anims'			: []
            },
            clbk = {
                'onBefore'		: [],
                'onAfter'		: []
            },
            queu = [],
            conf = $.extend(true, {}, $.fn.carouFredSel.configs, configs),
            opts = {},
            opts_orig = $.extend(true, {}, options),
            $wrp = (conf.wrapper == 'parent')
                ? $cfs.parent()
                : $cfs.wrap('<'+conf.wrapper.element+' class="'+conf.wrapper.classname+'" />').parent();


        conf.selector		= $cfs.selector;
        conf.serialNumber	= $.fn.carouFredSel.serialNumber++;

        conf.transition = (conf.transition && $.fn.transition) ? 'transition' : 'animate';

        //	create carousel
        FN._init(opts_orig, true, starting_position);
        FN._build();
        FN._bind_events();
        FN._bind_buttons();

        //	find item to start
        if (is_array(opts.items.start))
        {
            var start_arr = opts.items.start;
        }
        else
        {
            var start_arr = [];
            if (opts.items.start != 0)
            {
                start_arr.push(opts.items.start);
            }
        }
        if (opts.cookie)
        {
            start_arr.unshift(parseInt(cf_getCookie(opts.cookie), 10));
        }

        if (start_arr.length > 0)
        {
            for (var a = 0, l = start_arr.length; a < l; a++)
            {
                var s = start_arr[a];
                if (s == 0)
                {
                    continue;
                }
                if (s === true)
                {
                    s = window.location.hash;
                    if (s.length < 1)
                    {
                        continue;
                    }
                }
                else if (s === 'random')
                {
                    s = Math.floor(Math.random()*itms.total);
                }
                if ($cfs.triggerHandler(cf_e('slideTo', conf), [s, 0, true, { fx: 'none' }]))
                {
                    break;
                }
            }
        }
        var siz = sz_setSizes($cfs, opts),
            itm = gi_getCurrentItems($cfs.children(), opts);

        if (opts.onCreate)
        {
            opts.onCreate.call($tt0, {
                'width': siz.width,
                'height': siz.height,
                'items': itm
            });
        }

        $cfs.trigger(cf_e('updatePageStatus', conf), [true, siz]);
        $cfs.trigger(cf_e('linkAnchors', conf));

        if (conf.debug)
        {
            $cfs.trigger(cf_e('debug', conf));
        }

        return $cfs;
    };



    //	GLOBAL PUBLIC

    $.fn.carouFredSel.serialNumber = 1;
    $.fn.carouFredSel.defaults = {
        'synchronise'	: false,
        'infinite'		: true,
        'circular'		: true,
        'responsive'	: false,
        'direction'		: 'left',
        'items'			: {
            'start'			: 0
        },
        'scroll'		: {
            'easing'		: 'swing',
            'duration'		: 500,
            'pauseOnHover'	: false,
            'event'			: 'click',
            'queue'			: false
        }
    };
    $.fn.carouFredSel.configs = {
        'debug'			: false,
        'transition'	: false,
        'onWindowResize': 'throttle',
        'events'		: {
            'prefix'		: '',
            'namespace'		: 'cfs'
        },
        'wrapper'		: {
            'element'		: 'div',
            'classname'		: 'caroufredsel_wrapper'
        },
        'classnames'	: {}
    };
    $.fn.carouFredSel.pageAnchorBuilder = function(nr) {
        return '<a href="#"><span>'+nr+'</span></a>';
    };
    $.fn.carouFredSel.progressbarUpdater = function(perc) {
        $(this).css('width', perc+'%');
    };

    $.fn.carouFredSel.cookie = {
        get: function(n) {
            n += '=';
            var ca = document.cookie.split(';');
            for (var a = 0, l = ca.length; a < l; a++)
            {
                var c = ca[a];
                while (c.charAt(0) == ' ')
                {
                    c = c.slice(1);
                }
                if (c.indexOf(n) == 0)
                {
                    return c.slice(n.length);
                }
            }
            return 0;
        },
        set: function(n, v, d) {
            var e = "";
            if (d)
            {
                var date = new Date();
                date.setTime(date.getTime() + (d * 24 * 60 * 60 * 1000));
                e = "; expires=" + date.toGMTString();
            }
            document.cookie = n + '=' + v + e + '; path=/';
        },
        remove: function(n) {
            $.fn.carouFredSel.cookie.set(n, "", -1);
        }
    };


    //	GLOBAL PRIVATE

    //	scrolling functions
    function sc_setScroll(d, e, c) {
        if (c.transition == 'transition')
        {
            if (e == 'swing')
            {
                e = 'ease';
            }
        }
        return {
            anims: [],
            duration: d,
            orgDuration: d,
            easing: e,
            startTime: getTime()
        };
    }
    function sc_startScroll(s, c) {
        for (var a = 0, l = s.anims.length; a < l; a++)
        {
            var b = s.anims[a];
            if (!b)
            {
                continue;
            }
            b[0][c.transition](b[1], s.duration, s.easing, b[2]);
        }
    }
    function sc_stopScroll(s, finish) {
        if (!is_boolean(finish))
        {
            finish = true;
        }
        if (is_object(s.pre))
        {
            sc_stopScroll(s.pre, finish);
        }
        for (var a = 0, l = s.anims.length; a < l; a++)
        {
            var b = s.anims[a];
            b[0].stop(true);
            if (finish)
            {
                b[0].css(b[1]);
                if (is_function(b[2]))
                {
                    b[2]();
                }
            }
        }
        if (is_object(s.post))
        {
            sc_stopScroll(s.post, finish);
        }
    }
    function sc_afterScroll( $c, $c2, o ) {
        if ($c2)
        {
            $c2.remove();
        }

        switch(o.fx) {
            case 'fade':
            case 'crossfade':
            case 'cover-fade':
            case 'uncover-fade':
                $c.css('opacity', 1);
                $c.css('filter', '');
                break;
        }
    }
    function sc_fireCallbacks($t, o, b, a, c) {
        if (o[b])
        {
            o[b].call($t, a);
        }
        if (c[b].length)
        {
            for (var i = 0, l = c[b].length; i < l; i++)
            {
                c[b][i].call($t, a);
            }
        }
        return [];
    }
    function sc_fireQueue($c, q, c) {

        if (q.length)
        {
            $c.trigger(cf_e(q[0][0], c), q[0][1]);
            q.shift();
        }
        return q;
    }
    function sc_hideHiddenItems(hiddenitems) {
        hiddenitems.each(function() {
            var hi = $(this);
            hi.data('_cfs_isHidden', hi.is(':hidden')).hide();
        });
    }
    function sc_showHiddenItems(hiddenitems) {
        if (hiddenitems)
        {
            hiddenitems.each(function() {
                var hi = $(this);
                if (!hi.data('_cfs_isHidden'))
                {
                    hi.show();
                }
            });
        }
    }
    function sc_clearTimers(t) {
        if (t.auto)
        {
            clearTimeout(t.auto);
        }
        if (t.progress)
        {
            clearInterval(t.progress);
        }
        return t;
    }
    function sc_mapCallbackArguments(i_old, i_skp, i_new, s_itm, s_dir, s_dur, w_siz) {
        return {
            'width': w_siz.width,
            'height': w_siz.height,
            'items': {
                'old': i_old,
                'skipped': i_skp,
                'visible': i_new
            },
            'scroll': {
                'items': s_itm,
                'direction': s_dir,
                'duration': s_dur
            }
        };
    }
    function sc_getDuration( sO, o, nI, siz ) {
        var dur = sO.duration;
        if (sO.fx == 'none')
        {
            return 0;
        }
        if (dur == 'auto')
        {
            dur = o.scroll.duration / o.scroll.items * nI;
        }
        else if (dur < 10)
        {
            dur = siz / dur;
        }
        if (dur < 1)
        {
            return 0;
        }
        if (sO.fx == 'fade')
        {
            dur = dur / 2;
        }
        return Math.round(dur);
    }

    //	navigation functions
    function nv_showNavi(o, t, c) {
        var minimum = (is_number(o.items.minimum)) ? o.items.minimum : o.items.visible + 1;
        if (t == 'show' || t == 'hide')
        {
            var f = t;
        }
        else if (minimum > t)
        {
            debug(c, 'Not enough items ('+t+' total, '+minimum+' needed): Hiding navigation.');
            var f = 'hide';
        }
        else
        {
            var f = 'show';
        }
        var s = (f == 'show') ? 'removeClass' : 'addClass',
            h = cf_c('hidden', c);

        if (o.auto.button)
        {
            o.auto.button[f]()[s](h);
        }
        if (o.prev.button)
        {
            o.prev.button[f]()[s](h);
        }
        if (o.next.button)
        {
            o.next.button[f]()[s](h);
        }
        if (o.pagination.container)
        {
            o.pagination.container[f]()[s](h);
        }
    }
    function nv_enableNavi(o, f, c) {
        if (o.circular || o.infinite) return;
        var fx = (f == 'removeClass' || f == 'addClass') ? f : false,
            di = cf_c('disabled', c);

        if (o.auto.button && fx)
        {
            o.auto.button[fx](di);
        }
        if (o.prev.button)
        {
            var fn = fx || (f == 0) ? 'addClass' : 'removeClass';
            o.prev.button[fn](di);
        }
        if (o.next.button)
        {
            var fn = fx || (f == o.items.visible) ? 'addClass' : 'removeClass';
            o.next.button[fn](di);
        }
    }

    //	get object functions
    function go_getObject($tt, obj) {
        if (is_function(obj))
        {
            obj = obj.call($tt);
        }
        else if (is_undefined(obj))
        {
            obj = {};
        }
        return obj;
    }
    function go_getItemsObject($tt, obj) {
        obj = go_getObject($tt, obj);
        if (is_number(obj))
        {
            obj	= {
                'visible': obj
            };
        }
        else if (obj == 'variable')
        {
            obj = {
                'visible': obj,
                'width': obj,
                'height': obj
            };
        }
        else if (!is_object(obj))
        {
            obj = {};
        }
        return obj;
    }
    function go_getScrollObject($tt, obj) {
        obj = go_getObject($tt, obj);
        if (is_number(obj))
        {
            if (obj <= 50)
            {
                obj = {
                    'items': obj
                };
            }
            else
            {
                obj = {
                    'duration': obj
                };
            }
        }
        else if (is_string(obj))
        {
            obj = {
                'easing': obj
            };
        }
        else if (!is_object(obj))
        {
            obj = {};
        }
        return obj;
    }
    function go_getNaviObject($tt, obj) {
        obj = go_getObject($tt, obj);
        if (is_string(obj))
        {
            var temp = cf_getKeyCode(obj);
            if (temp == -1)
            {
                obj = $(obj);
            }
            else
            {
                obj = temp;
            }
        }
        return obj;
    }

    function go_getAutoObject($tt, obj) {
        obj = go_getNaviObject($tt, obj);
        if (is_jquery(obj))
        {
            obj = {
                'button': obj
            };
        }
        else if (is_boolean(obj))
        {
            obj = {
                'play': obj
            };
        }
        else if (is_number(obj))
        {
            obj = {
                'timeoutDuration': obj
            };
        }
        if (obj.progress)
        {
            if (is_string(obj.progress) || is_jquery(obj.progress))
            {
                obj.progress = {
                    'bar': obj.progress
                };
            }
        }
        return obj;
    }
    function go_complementAutoObject($tt, obj) {
        if (is_function(obj.button))
        {
            obj.button = obj.button.call($tt);
        }
        if (is_string(obj.button))
        {
            obj.button = $(obj.button);
        }
        if (!is_boolean(obj.play))
        {
            obj.play = true;
        }
        if (!is_number(obj.delay))
        {
            obj.delay = 0;
        }
        if (is_undefined(obj.pauseOnEvent))
        {
            obj.pauseOnEvent = true;
        }
        if (!is_boolean(obj.pauseOnResize))
        {
            obj.pauseOnResize = true;
        }
        if (!is_number(obj.timeoutDuration))
        {
            obj.timeoutDuration = (obj.duration < 10)
                ? 2500
                : obj.duration * 5;
        }
        if (obj.progress)
        {
            if (is_function(obj.progress.bar))
            {
                obj.progress.bar = obj.progress.bar.call($tt);
            }
            if (is_string(obj.progress.bar))
            {
                obj.progress.bar = $(obj.progress.bar);
            }
            if (obj.progress.bar)
            {
                if (!is_function(obj.progress.updater))
                {
                    obj.progress.updater = $.fn.carouFredSel.progressbarUpdater;
                }
                if (!is_number(obj.progress.interval))
                {
                    obj.progress.interval = 50;
                }
            }
            else
            {
                obj.progress = false;
            }
        }
        return obj;
    }

    function go_getPrevNextObject($tt, obj) {
        obj = go_getNaviObject($tt, obj);
        if (is_jquery(obj))
        {
            obj = {
                'button': obj
            };
        }
        else if (is_number(obj))
        {
            obj = {
                'key': obj
            };
        }
        return obj;
    }
    function go_complementPrevNextObject($tt, obj) {
        if (is_function(obj.button))
        {
            obj.button = obj.button.call($tt);
        }
        if (is_string(obj.button))
        {
            obj.button = $(obj.button);
        }
        if (is_string(obj.key))
        {
            obj.key = cf_getKeyCode(obj.key);
        }
        return obj;
    }

    function go_getPaginationObject($tt, obj) {
        obj = go_getNaviObject($tt, obj);
        if (is_jquery(obj))
        {
            obj = {
                'container': obj
            };
        }
        else if (is_boolean(obj))
        {
            obj = {
                'keys': obj
            };
        }
        return obj;
    }
    function go_complementPaginationObject($tt, obj) {
        if (is_function(obj.container))
        {
            obj.container = obj.container.call($tt);
        }
        if (is_string(obj.container))
        {
            obj.container = $(obj.container);
        }
        if (!is_number(obj.items))
        {
            obj.items = false;
        }
        if (!is_boolean(obj.keys))
        {
            obj.keys = false;
        }
        if (!is_function(obj.anchorBuilder) && !is_false(obj.anchorBuilder))
        {
            obj.anchorBuilder = $.fn.carouFredSel.pageAnchorBuilder;
        }
        if (!is_number(obj.deviation))
        {
            obj.deviation = 0;
        }
        return obj;
    }

    function go_getSwipeObject($tt, obj) {
        if (is_function(obj))
        {
            obj = obj.call($tt);
        }
        if (is_undefined(obj))
        {
            obj = {
                'onTouch': false
            };
        }
        if (is_true(obj))
        {
            obj = {
                'onTouch': obj
            };
        }
        else if (is_number(obj))
        {
            obj = {
                'items': obj
            };
        }
        return obj;
    }
    function go_complementSwipeObject($tt, obj) {
        if (!is_boolean(obj.onTouch))
        {
            obj.onTouch = true;
        }
        if (!is_boolean(obj.onMouse))
        {
            obj.onMouse = false;
        }
        if (!is_object(obj.options))
        {
            obj.options = {};
        }
        if (!is_boolean(obj.options.triggerOnTouchEnd))
        {
            obj.options.triggerOnTouchEnd = false;
        }
        return obj;
    }
    function go_getMousewheelObject($tt, obj) {
        if (is_function(obj))
        {
            obj = obj.call($tt);
        }
        if (is_true(obj))
        {
            obj = {};
        }
        else if (is_number(obj))
        {
            obj = {
                'items': obj
            };
        }
        else if (is_undefined(obj))
        {
            obj = false;
        }
        return obj;
    }
    function go_complementMousewheelObject($tt, obj) {
        return obj;
    }

    //	get number functions
    function gn_getItemIndex(num, dev, org, items, $cfs) {
        if (is_string(num))
        {
            num = $(num, $cfs);
        }

        if (is_object(num))
        {
            num = $(num, $cfs);
        }
        if (is_jquery(num))
        {
            num = $cfs.children().index(num);
            if (!is_boolean(org))
            {
                org = false;
            }
        }
        else
        {
            if (!is_boolean(org))
            {
                org = true;
            }
        }
        if (!is_number(num))
        {
            num = 0;
        }
        if (!is_number(dev))
        {
            dev = 0;
        }

        if (org)
        {
            num += items.first;
        }
        num += dev;
        if (items.total > 0)
        {
            while (num >= items.total)
            {
                num -= items.total;
            }
            while (num < 0)
            {
                num += items.total;
            }
        }
        return num;
    }

    //	items prev
    function gn_getVisibleItemsPrev(i, o, s) {
        var t = 0,
            x = 0;

        for (var a = s; a >= 0; a--)
        {
            var j = i.eq(a);
            t += (j.is(':visible')) ? j[o.d['outerWidth']](true) : 0;
            if (t > o.maxDimension)
            {
                return x;
            }
            if (a == 0)
            {
                a = i.length;
            }
            x++;
        }
    }
    function gn_getVisibleItemsPrevFilter(i, o, s) {
        return gn_getItemsPrevFilter(i, o.items.filter, o.items.visibleConf.org, s);
    }
    function gn_getScrollItemsPrevFilter(i, o, s, m) {
        return gn_getItemsPrevFilter(i, o.items.filter, m, s);
    }
    function gn_getItemsPrevFilter(i, f, m, s) {
        var t = 0,
            x = 0;

        for (var a = s, l = i.length; a >= 0; a--)
        {
            x++;
            if (x == l)
            {
                return x;
            }

            var j = i.eq(a);
            if (j.is(f))
            {
                t++;
                if (t == m)
                {
                    return x;
                }
            }
            if (a == 0)
            {
                a = l;
            }
        }
    }

    function gn_getVisibleOrg($c, o) {
        return o.items.visibleConf.org || $c.children().slice(0, o.items.visible).filter(o.items.filter).length;
    }

    //	items next
    function gn_getVisibleItemsNext(i, o, s) {
        var t = 0,
            x = 0;

        for (var a = s, l = i.length-1; a <= l; a++)
        {
            var j = i.eq(a);

            t += (j.is(':visible')) ? j[o.d['outerWidth']](true) : 0;
            if (t > o.maxDimension)
            {
                return x;
            }

            x++;
            if (x == l+1)
            {
                return x;
            }
            if (a == l)
            {
                a = -1;
            }
        }
    }
    function gn_getVisibleItemsNextTestCircular(i, o, s, l) {
        var v = gn_getVisibleItemsNext(i, o, s);
        if (!o.circular)
        {
            if (s + v > l)
            {
                v = l - s;
            }
        }
        return v;
    }
    function gn_getVisibleItemsNextFilter(i, o, s) {
        return gn_getItemsNextFilter(i, o.items.filter, o.items.visibleConf.org, s, o.circular);
    }
    function gn_getScrollItemsNextFilter(i, o, s, m) {
        return gn_getItemsNextFilter(i, o.items.filter, m+1, s, o.circular) - 1;
    }
    function gn_getItemsNextFilter(i, f, m, s, c) {
        var t = 0,
            x = 0;

        for (var a = s, l = i.length-1; a <= l; a++)
        {
            x++;
            if (x >= l)
            {
                return x;
            }

            var j = i.eq(a);
            if (j.is(f))
            {
                t++;
                if (t == m)
                {
                    return x;
                }
            }
            if (a == l)
            {
                a = -1;
            }
        }
    }

    //	get items functions
    function gi_getCurrentItems(i, o) {
        return i.slice(0, o.items.visible);
    }
    function gi_getOldItemsPrev(i, o, n) {
        return i.slice(n, o.items.visibleConf.old+n);
    }
    function gi_getNewItemsPrev(i, o) {
        return i.slice(0, o.items.visible);
    }
    function gi_getOldItemsNext(i, o) {
        return i.slice(0, o.items.visibleConf.old);
    }
    function gi_getNewItemsNext(i, o, n) {
        return i.slice(n, o.items.visible+n);
    }

    //	sizes functions
    function sz_storeMargin(i, o, d) {
        if (o.usePadding)
        {
            if (!is_string(d))
            {
                d = '_cfs_origCssMargin';
            }
            i.each(function() {
                var j = $(this),
                    m = parseInt(j.css(o.d['marginRight']), 10);
                if (!is_number(m))
                {
                    m = 0;
                }
                j.data(d, m);
            });
        }
    }
    function sz_resetMargin(i, o, m) {
        if (o.usePadding)
        {
            var x = (is_boolean(m)) ? m : false;
            if (!is_number(m))
            {
                m = 0;
            }
            sz_storeMargin(i, o, '_cfs_tempCssMargin');
            i.each(function() {
                var j = $(this);
                j.css(o.d['marginRight'], ((x) ? j.data('_cfs_tempCssMargin') : m + j.data('_cfs_origCssMargin')));
            });
        }
    }
    function sz_storeOrigCss(i) {
        i.each(function() {
            var j = $(this);
            j.data('_cfs_origCss', j.attr('style') || '');
        });
    }
    function sz_restoreOrigCss(i) {
        i.each(function() {
            var j = $(this);
            j.attr('style', j.data('_cfs_origCss') || '');
        });
    }
    function sz_setResponsiveSizes(o, all) {
        var visb = o.items.visible,
            newS = o.items[o.d['width']],
            seco = o[o.d['height']],
            secp = is_percentage(seco);

        all.each(function() {
            var $t = $(this),
                nw = newS - ms_getPaddingBorderMargin($t, o, 'Width');

            $t[o.d['width']](nw);
            if (secp)
            {
                $t[o.d['height']](ms_getPercentage(nw, seco));
            }
        });
    }
    function sz_setSizes($c, o) {
        var $w = $c.parent(),
            $i = $c.children(),
            $v = gi_getCurrentItems($i, o),
            sz = cf_mapWrapperSizes(ms_getSizes($v, o, true), o, false);

        $w.css(sz);

        if (o.usePadding)
        {
            var p = o.padding,
                r = p[o.d[1]];

            if (o.align && r < 0)
            {
                r = 0;
            }
            var $l = $v.last();
            $l.css(o.d['marginRight'], $l.data('_cfs_origCssMargin') + r);
            $c.css(o.d['top'], p[o.d[0]]);
            $c.css(o.d['left'], p[o.d[3]]);
        }

        $c.css(o.d['width'], sz[o.d['width']]+(ms_getTotalSize($i, o, 'width')*2));
        $c.css(o.d['height'], ms_getLargestSize($i, o, 'height'));
        return sz;
    }

    //	measuring functions
    function ms_getSizes(i, o, wrapper) {
        return [ms_getTotalSize(i, o, 'width', wrapper), ms_getLargestSize(i, o, 'height', wrapper)];
    }
    function ms_getLargestSize(i, o, dim, wrapper) {
        if (!is_boolean(wrapper))
        {
            wrapper = false;
        }
        if (is_number(o[o.d[dim]]) && wrapper)
        {
            return o[o.d[dim]];
        }
        if (is_number(o.items[o.d[dim]]))
        {
            return o.items[o.d[dim]];
        }
        dim = (dim.toLowerCase().indexOf('width') > -1) ? 'outerWidth' : 'outerHeight';
        return ms_getTrueLargestSize(i, o, dim);
    }
    function ms_getTrueLargestSize(i, o, dim) {
        var s = 0;

        for (var a = 0, l = i.length; a < l; a++)
        {
            var j = i.eq(a);

            var m = (j.is(':visible')) ? j[o.d[dim]](true) : 0;
            if (s < m)
            {
                s = m;
            }
        }
        return s;
    }

    function ms_getTotalSize(i, o, dim, wrapper) {
        if (!is_boolean(wrapper))
        {
            wrapper = false;
        }
        if (is_number(o[o.d[dim]]) && wrapper)
        {
            return o[o.d[dim]];
        }
        if (is_number(o.items[o.d[dim]]))
        {
            return o.items[o.d[dim]] * i.length;
        }

        var d = (dim.toLowerCase().indexOf('width') > -1) ? 'outerWidth' : 'outerHeight',
            s = 0;

        for (var a = 0, l = i.length; a < l; a++)
        {
            var j = i.eq(a);
            s += (j.is(':visible')) ? j[o.d[d]](true) : 0;
        }
        return s;
    }
    function ms_getParentSize($w, o, d) {
        var isVisible = $w.is(':visible');
        if (isVisible)
        {
            $w.hide();
        }
        var s = $w.parent()[o.d[d]]();
        if (isVisible)
        {
            $w.show();
        }
        return s;
    }
    function ms_getMaxDimension(o, a) {
        return (is_number(o[o.d['width']])) ? o[o.d['width']] : a;
    }
    function ms_hasVariableSizes(i, o, dim) {
        var s = false,
            v = false;

        for (var a = 0, l = i.length; a < l; a++)
        {
            var j = i.eq(a);

            var c = (j.is(':visible')) ? j[o.d[dim]](true) : 0;
            if (s === false)
            {
                s = c;
            }
            else if (s != c)
            {
                v = true;
            }
            if (s == 0)
            {
                v = true;
            }
        }
        return v;
    }
    function ms_getPaddingBorderMargin(i, o, d) {
        return i[o.d['outer'+d]](true) - i[o.d[d.toLowerCase()]]();
    }
    function ms_getPercentage(s, o) {
        if (is_percentage(o))
        {
            o = parseInt( o.slice(0, -1), 10 );
            if (!is_number(o))
            {
                return s;
            }
            s *= o/100;
        }
        return s;
    }

    //	config functions
    function cf_e(n, c, pf, ns, rd) {
        if (!is_boolean(pf))
        {
            pf = true;
        }
        if (!is_boolean(ns))
        {
            ns = true;
        }
        if (!is_boolean(rd))
        {
            rd = false;
        }

        if (pf)
        {
            n = c.events.prefix + n;
        }
        if (ns)
        {
            n = n +'.'+ c.events.namespace;
        }
        if (ns && rd)
        {
            n += c.serialNumber;
        }

        return n;
    }
    function cf_c(n, c) {
        return (is_string(c.classnames[n])) ? c.classnames[n] : n;
    }
    function cf_mapWrapperSizes(ws, o, p) {
        if (!is_boolean(p))
        {
            p = true;
        }
        var pad = (o.usePadding && p) ? o.padding : [0, 0, 0, 0];
        var wra = {};

        wra[o.d['width']] = ws[0] + pad[1] + pad[3];
        wra[o.d['height']] = ws[1] + pad[0] + pad[2];

        return wra;
    }
    function cf_sortParams(vals, typs) {
        var arr = [];
        for (var a = 0, l1 = vals.length; a < l1; a++)
        {
            for (var b = 0, l2 = typs.length; b < l2; b++)
            {
                if (typs[b].indexOf(typeof vals[a]) > -1 && is_undefined(arr[b]))
                {
                    arr[b] = vals[a];
                    break;
                }
            }
        }
        return arr;
    }
    function cf_getPadding(p) {
        if (is_undefined(p))
        {
            return [0, 0, 0, 0];
        }
        if (is_number(p))
        {
            return [p, p, p, p];
        }
        if (is_string(p))
        {
            p = p.split('px').join('').split('em').join('').split(' ');
        }

        if (!is_array(p))
        {
            return [0, 0, 0, 0];
        }
        for (var i = 0; i < 4; i++)
        {
            p[i] = parseInt(p[i], 10);
        }
        switch (p.length)
        {
            case 0:
                return [0, 0, 0, 0];
            case 1:
                return [p[0], p[0], p[0], p[0]];
            case 2:
                return [p[0], p[1], p[0], p[1]];
            case 3:
                return [p[0], p[1], p[2], p[1]];
            default:
                return [p[0], p[1], p[2], p[3]];
        }
    }
    function cf_getAlignPadding(itm, o) {
        var x = (is_number(o[o.d['width']])) ? Math.ceil(o[o.d['width']] - ms_getTotalSize(itm, o, 'width')) : 0;
        switch (o.align)
        {
            case 'left':
                return [0, x];
            case 'right':
                return [x, 0];
            case 'center':
            default:
                return [Math.ceil(x/2), Math.floor(x/2)];
        }
    }
    function cf_getDimensions(o) {
        var dm = [
            ['width'	, 'innerWidth'	, 'outerWidth'	, 'height'	, 'innerHeight'	, 'outerHeight'	, 'left', 'top'	, 'marginRight'	, 0, 1, 2, 3],
            ['height'	, 'innerHeight'	, 'outerHeight'	, 'width'	, 'innerWidth'	, 'outerWidth'	, 'top'	, 'left', 'marginBottom', 3, 2, 1, 0]
        ];

        var dl = dm[0].length,
            dx = (o.direction == 'right' || o.direction == 'left') ? 0 : 1;

        var dimensions = {};
        for (var d = 0; d < dl; d++)
        {
            dimensions[dm[0][d]] = dm[dx][d];
        }
        return dimensions;
    }
    function cf_getAdjust(x, o, a, $t) {
        var v = x;
        if (is_function(a))
        {
            v = a.call($t, v);

        }
        else if (is_string(a))
        {
            var p = a.split('+'),
                m = a.split('-');

            if (m.length > p.length)
            {
                var neg = true,
                    sta = m[0],
                    adj = m[1];
            }
            else
            {
                var neg = false,
                    sta = p[0],
                    adj = p[1];
            }

            switch(sta)
            {
                case 'even':
                    v = (x % 2 == 1) ? x-1 : x;
                    break;
                case 'odd':
                    v = (x % 2 == 0) ? x-1 : x;
                    break;
                default:
                    v = x;
                    break;
            }
            adj = parseInt(adj, 10);
            if (is_number(adj))
            {
                if (neg)
                {
                    adj = -adj;
                }
                v += adj;
            }
        }
        if (!is_number(v) || v < 1)
        {
            v = 1;
        }
        return v;
    }
    function cf_getItemsAdjust(x, o, a, $t) {
        return cf_getItemAdjustMinMax(cf_getAdjust(x, o, a, $t), o.items.visibleConf);
    }
    function cf_getItemAdjustMinMax(v, i) {
        if (is_number(i.min) && v < i.min)
        {
            v = i.min;
        }
        if (is_number(i.max) && v > i.max)
        {
            v = i.max;
        }
        if (v < 1)
        {
            v = 1;
        }
        return v;
    }
    function cf_getSynchArr(s) {
        if (!is_array(s))
        {
            s = [[s]];
        }
        if (!is_array(s[0]))
        {
            s = [s];
        }
        for (var j = 0, l = s.length; j < l; j++)
        {
            if (is_string(s[j][0]))
            {
                s[j][0] = $(s[j][0]);
            }
            if (!is_boolean(s[j][1]))
            {
                s[j][1] = true;
            }
            if (!is_boolean(s[j][2]))
            {
                s[j][2] = true;
            }
            if (!is_number(s[j][3]))
            {
                s[j][3] = 0;
            }
        }
        return s;
    }
    function cf_getKeyCode(k) {
        if (k == 'right')
        {
            return 39;
        }
        if (k == 'left')
        {
            return 37;
        }
        if (k == 'up')
        {
            return 38;
        }
        if (k == 'down')
        {
            return 40;
        }
        return -1;
    }
    function cf_setCookie(n, $c, c) {
        if (n)
        {
            var v = $c.triggerHandler(cf_e('currentPosition', c));
            $.fn.carouFredSel.cookie.set(n, v);
        }
    }
    function cf_getCookie(n) {
        var c = $.fn.carouFredSel.cookie.get(n);
        return (c == '') ? 0 : c;
    }

    //	init function
    function in_mapCss($elem, props) {
        var css = {};
        for (var p = 0, l = props.length; p < l; p++)
        {
            css[props[p]] = $elem.css(props[p]);
        }
        return css;
    }
    function in_complementItems(obj, opt, itm, sta) {
        if (!is_object(obj.visibleConf))
        {
            obj.visibleConf = {};
        }
        if (!is_object(obj.sizesConf))
        {
            obj.sizesConf = {};
        }

        if (obj.start == 0 && is_number(sta))
        {
            obj.start = sta;
        }

        //	visible items
        if (is_object(obj.visible))
        {
            obj.visibleConf.min = obj.visible.min;
            obj.visibleConf.max = obj.visible.max;
            obj.visible = false;
        }
        else if (is_string(obj.visible))
        {
            //	variable visible items
            if (obj.visible == 'variable')
            {
                obj.visibleConf.variable = true;
            }
            //	adjust string visible items
            else
            {
                obj.visibleConf.adjust = obj.visible;
            }
            obj.visible = false;
        }
        else if (is_function(obj.visible))
        {
            obj.visibleConf.adjust = obj.visible;
            obj.visible = false;
        }

        //	set items filter
        if (!is_string(obj.filter))
        {
            obj.filter = (itm.filter(':hidden').length > 0) ? ':visible' : '*';
        }

        //	primary item-size not set
        if (!obj[opt.d['width']])
        {
            //	responsive carousel -> set to largest
            if (opt.responsive)
            {
                debug(true, 'Set a '+opt.d['width']+' for the items!');
                obj[opt.d['width']] = ms_getTrueLargestSize(itm, opt, 'outerWidth');
            }
            //	 non-responsive -> measure it or set to "variable"
            else
            {
                obj[opt.d['width']] = (ms_hasVariableSizes(itm, opt, 'outerWidth'))
                    ? 'variable'
                    : itm[opt.d['outerWidth']](true);
            }
        }

        //	secondary item-size not set -> measure it or set to "variable"
        if (!obj[opt.d['height']])
        {
            obj[opt.d['height']] = (ms_hasVariableSizes(itm, opt, 'outerHeight'))
                ? 'variable'
                : itm[opt.d['outerHeight']](true);
        }

        obj.sizesConf.width = obj.width;
        obj.sizesConf.height = obj.height;
        return obj;
    }
    function in_complementVisibleItems(opt, avl) {
        //	primary item-size variable -> set visible items variable
        if (opt.items[opt.d['width']] == 'variable')
        {
            opt.items.visibleConf.variable = true;
        }
        if (!opt.items.visibleConf.variable) {
            //	primary size is number -> calculate visible-items
            if (is_number(opt[opt.d['width']]))
            {
                opt.items.visible = Math.floor(opt[opt.d['width']] / opt.items[opt.d['width']]);
            }
            //	measure and calculate primary size and visible-items
            else
            {
                opt.items.visible = Math.floor(avl / opt.items[opt.d['width']]);
                opt[opt.d['width']] = opt.items.visible * opt.items[opt.d['width']];
                if (!opt.items.visibleConf.adjust)
                {
                    opt.align = false;
                }
            }
            if (opt.items.visible == 'Infinity' || opt.items.visible < 1)
            {
                debug(true, 'Not a valid number of visible items: Set to "variable".');
                opt.items.visibleConf.variable = true;
            }
        }
        return opt;
    }
    function in_complementPrimarySize(obj, opt, all) {
        //	primary size set to auto -> measure largest item-size and set it
        if (obj == 'auto')
        {
            obj = ms_getTrueLargestSize(all, opt, 'outerWidth');
        }
        return obj;
    }
    function in_complementSecondarySize(obj, opt, all) {
        //	secondary size set to auto -> measure largest item-size and set it
        if (obj == 'auto')
        {
            obj = ms_getTrueLargestSize(all, opt, 'outerHeight');
        }
        //	secondary size not set -> set to secondary item-size
        if (!obj)
        {
            obj = opt.items[opt.d['height']];
        }
        return obj;
    }
    function in_getAlignPadding(o, all) {
        var p = cf_getAlignPadding(gi_getCurrentItems(all, o), o);
        o.padding[o.d[1]] = p[1];
        o.padding[o.d[3]] = p[0];
        return o;
    }
    function in_getResponsiveValues(o, all, avl) {

        var visb = cf_getItemAdjustMinMax(Math.ceil(o[o.d['width']] / o.items[o.d['width']]), o.items.visibleConf);
        if (visb > all.length)
        {
            visb = all.length;
        }

        var newS = Math.floor(o[o.d['width']]/visb);

        o.items.visible = visb;
        o.items[o.d['width']] = newS;
        o[o.d['width']] = visb * newS;
        return o;
    }


    //	buttons functions
    function bt_pauseOnHoverConfig(p) {
        if (is_string(p))
        {
            var i = (p.indexOf('immediate') > -1) ? true : false,
                r = (p.indexOf('resume') 	> -1) ? true : false;
        }
        else
        {
            var i = r = false;
        }
        return [i, r];
    }
    function bt_mousesheelNumber(mw) {
        return (is_number(mw)) ? mw : null
    }

    //	helper functions
    function is_null(a) {
        return (a === null);
    }
    function is_undefined(a) {
        return (is_null(a) || typeof a == 'undefined' || a === '' || a === 'undefined');
    }
    function is_array(a) {
        return (a instanceof Array);
    }
    function is_jquery(a) {
        return (a instanceof jQuery);
    }
    function is_object(a) {
        return ((a instanceof Object || typeof a == 'object') && !is_null(a) && !is_jquery(a) && !is_array(a) && !is_function(a));
    }
    function is_number(a) {
        return ((a instanceof Number || typeof a == 'number') && !isNaN(a));
    }
    function is_string(a) {
        return ((a instanceof String || typeof a == 'string') && !is_undefined(a) && !is_true(a) && !is_false(a));
    }
    function is_function(a) {
        return (a instanceof Function || typeof a == 'function');
    }
    function is_boolean(a) {
        return (a instanceof Boolean || typeof a == 'boolean' || is_true(a) || is_false(a));
    }
    function is_true(a) {
        return (a === true || a === 'true');
    }
    function is_false(a) {
        return (a === false || a === 'false');
    }
    function is_percentage(x) {
        return (is_string(x) && x.slice(-1) == '%');
    }


    function getTime() {
        return new Date().getTime();
    }

    function deprecated( o, n ) {
        debug(true, o+' is DEPRECATED, support for it will be removed. Use '+n+' instead.');
    }
    function debug(d, m) {
        if (!is_undefined(window.console) && !is_undefined(window.console.log))
        {
            if (is_object(d))
            {
                var s = ' ('+d.selector+')';
                d = d.debug;
            }
            else
            {
                var s = '';
            }
            if (!d)
            {
                return false;
            }

            if (is_string(m))
            {
                m = 'carouFredSel'+s+': ' + m;
            }
            else
            {
                m = ['carouFredSel'+s+':', m];
            }
            window.console.log(m);
        }
        return false;
    }



    //	EASING FUNCTIONS
    $.extend($.easing, {
        'quadratic': function(t) {
            var t2 = t * t;
            return t * (-t2 * t + 4 * t2 - 6 * t + 4);
        },
        'cubic': function(t) {
            return t * (4 * t * t - 9 * t + 6);
        },
        'elastic': function(t) {
            var t2 = t * t;
            return t * (33 * t2 * t2 - 106 * t2 * t + 126 * t2 - 67 * t + 15);
        }
    });


})(jQuery);


/*
 * @fileOverview TouchSwipe - jQuery Plugin
 * @version 1.6.6
 *
 * @author Matt Bryson http://www.github.com/mattbryson
 * @see https://github.com/mattbryson/TouchSwipe-Jquery-Plugin
 * @see http://labs.rampinteractive.co.uk/touchSwipe/
 * @see http://plugins.jquery.com/project/touchSwipe
 *
 * Copyright (c) 2010-2015 Matt Bryson
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 */

/*
 *
 * Changelog
 * $Date: 2010-12-12 (Wed, 12 Dec 2010) $
 * $version: 1.0.0
 * $version: 1.0.1 - removed multibyte comments
 *
 * $Date: 2011-21-02 (Mon, 21 Feb 2011) $
 * $version: 1.1.0 	- added allowPageScroll property to allow swiping and scrolling of page
 *					- changed handler signatures so one handler can be used for multiple events
 * $Date: 2011-23-02 (Wed, 23 Feb 2011) $
 * $version: 1.2.0 	- added click handler. This is fired if the user simply clicks and does not swipe. The event object and click target are passed to handler.
 *					- If you use the http://code.google.com/p/jquery-ui-for-ipad-and-iphone/ plugin, you can also assign jQuery mouse events to children of a touchSwipe object.
 * $version: 1.2.1 	- removed console log!
 *
 * $version: 1.2.2 	- Fixed bug where scope was not preserved in callback methods.
 *
 * $Date: 2011-28-04 (Thurs, 28 April 2011) $
 * $version: 1.2.4 	- Changed licence terms to be MIT or GPL inline with jQuery. Added check for support of touch events to stop non compatible browsers erroring.
 *
 * $Date: 2011-27-09 (Tues, 27 September 2011) $
 * $version: 1.2.5 	- Added support for testing swipes with mouse on desktop browser (thanks to https://github.com/joelhy)
 *
 * $Date: 2012-14-05 (Mon, 14 May 2012) $
 * $version: 1.2.6 	- Added timeThreshold between start and end touch, so user can ignore slow swipes (thanks to Mark Chase). Default is null, all swipes are detected
 *
 * $Date: 2012-05-06 (Tues, 05 June 2012) $
 * $version: 1.2.7 	- Changed time threshold to have null default for backwards compatibility. Added duration param passed back in events, and refactored how time is handled.
 *
 * $Date: 2012-05-06 (Tues, 05 June 2012) $
 * $version: 1.2.8 	- Added the possibility to return a value like null or false in the trigger callback. In that way we can control when the touch start/move should take effect or not (simply by returning in some cases return null; or return false;) This effects the ontouchstart/ontouchmove event.
 *
 * $Date: 2012-06-06 (Wed, 06 June 2012) $
 * $version: 1.3.0 	- Refactored whole plugin to allow for methods to be executed, as well as exposed defaults for user override. Added 'enable', 'disable', and 'destroy' methods
 *
 * $Date: 2012-05-06 (Fri, 05 June 2012) $
 * $version: 1.3.1 	- Bug fixes  - bind() with false as last argument is no longer supported in jQuery 1.6, also, if you just click, the duration is now returned correctly.
 *
 * $Date: 2012-29-07 (Sun, 29 July 2012) $
 * $version: 1.3.2	- Added fallbackToMouseEvents option to NOT capture mouse events on non touch devices.
 * 			- Added "all" fingers value to the fingers property, so any combination of fingers triggers the swipe, allowing event handlers to check the finger count
 *
 * $Date: 2012-09-08 (Thurs, 9 Aug 2012) $
 * $version: 1.3.3	- Code tidy prep for minefied version
 *
 * $Date: 2012-04-10 (wed, 4 Oct 2012) $
 * $version: 1.4.0	- Added pinch support, pinchIn and pinchOut
 *
 * $Date: 2012-11-10 (Thurs, 11 Oct 2012) $
 * $version: 1.5.0	- Added excludedElements, a jquery selector that specifies child elements that do NOT trigger swipes. By default, this is one select that removes all form, input select, button and anchor elements.
 *
 * $Date: 2012-22-10 (Mon, 22 Oct 2012) $
 * $version: 1.5.1	- Fixed bug with jQuery 1.8 and trailing comma in excludedElements
 *					- Fixed bug with IE and eventPreventDefault()
 * $Date: 2013-01-12 (Fri, 12 Jan 2013) $
 * $version: 1.6.0	- Fixed bugs with pinching, mainly when both pinch and swipe enabled, as well as adding time threshold for multifinger gestures, so releasing one finger beofre the other doesnt trigger as single finger gesture.
 *					- made the demo site all static local HTML pages so they can be run locally by a developer
 *					- added jsDoc comments and added documentation for the plugin
 *					- code tidy
 *					- added triggerOnTouchLeave property that will end the event when the user swipes off the element.
 * $Date: 2013-03-23 (Sat, 23 Mar 2013) $
 * $version: 1.6.1	- Added support for ie8 touch events
 * $version: 1.6.2	- Added support for events binding with on / off / bind in jQ for all callback names.
 *                   - Deprecated the 'click' handler in favour of tap.
 *                   - added cancelThreshold property
 *                   - added option method to update init options at runtime
 * $version 1.6.3    - added doubletap, longtap events and longTapThreshold, doubleTapThreshold property
 *
 * $Date: 2013-04-04 (Thurs, 04 April 2013) $
 * $version 1.6.4    - Fixed bug with cancelThreshold introduced in 1.6.3, where swipe status no longer fired start event, and stopped once swiping back.
 *
 * $Date: 2013-08-24 (Sat, 24 Aug 2013) $
 * $version 1.6.5    - Merged a few pull requests fixing various bugs, added AMD support.
 *
 * $Date: 2014-06-04 (Wed, 04 June 2014) $
 * $version 1.6.6 	- Merge of pull requests.
 *    				- IE10 touch support
 *    				- Only prevent default event handling on valid swipe
 *    				- Separate license/changelog comment
 *    				- Detect if the swipe is valid at the end of the touch event.
 *    				- Pass fingerdata to event handlers.
 *    				- Add 'hold' gesture
 *    				- Be more tolerant about the tap distance
 *    				- Typos and minor fixes
 *
 * $Date: 2015-22-01 (Thurs, 22 Jan 2015) $
 * $version 1.6.7    - Added patch from https://github.com/mattbryson/TouchSwipe-Jquery-Plugin/issues/206 to fix memory leak
 *
 * $Date: 2015-2-2 (Mon, 2 Feb 2015) $
 * $version 1.6.7    - Added preventDefaultEvents option to proxy events regardless.
 *					- Fixed issue with swipe and pinch not triggering at the same time
 */

/**
 * See (http://jquery.com/).
 * @name $
 * @class
 * See the jQuery Library  (http://jquery.com/) for full details.  This just
 * documents the function and classes that are added to jQuery by this plug-in.
 */

/**
 * See (http://jquery.com/)
 * @name fn
 * @class
 * See the jQuery Library  (http://jquery.com/) for full details.  This just
 * documents the function and classes that are added to jQuery by this plug-in.
 * @memberOf $
 */



(function (factory) {
    if (typeof define === 'function' && define.amd && define.amd.jQuery) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals.
        factory(jQuery);
    }
}(function ($) {
    "use strict";

    //Constants
    var LEFT = "left",
        RIGHT = "right",
        UP = "up",
        DOWN = "down",
        IN = "in",
        OUT = "out",

        NONE = "none",
        AUTO = "auto",

        SWIPE = "swipe",
        PINCH = "pinch",
        TAP = "tap",
        DOUBLE_TAP = "doubletap",
        LONG_TAP = "longtap",
        HOLD = "hold",

        HORIZONTAL = "horizontal",
        VERTICAL = "vertical",

        ALL_FINGERS = "all",

        DOUBLE_TAP_THRESHOLD = 10,

        PHASE_START = "start",
        PHASE_MOVE = "move",
        PHASE_END = "end",
        PHASE_CANCEL = "cancel",

        SUPPORTS_TOUCH = 'ontouchstart' in window,

        SUPPORTS_POINTER_IE10 = window.navigator.msPointerEnabled && !window.navigator.pointerEnabled,

        SUPPORTS_POINTER = window.navigator.pointerEnabled || window.navigator.msPointerEnabled,

        PLUGIN_NS = 'TouchSwipe';



    /**
     * The default configuration, and available options to configure touch swipe with.
     * You can set the default values by updating any of the properties prior to instantiation.
     * @name $.fn.swipe.defaults
     * @namespace
     * @property {int} [fingers=1] The number of fingers to detect in a swipe. Any swipes that do not meet this requirement will NOT trigger swipe handlers.
     * @property {int} [threshold=75] The number of pixels that the user must move their finger by before it is considered a swipe.
     * @property {int} [cancelThreshold=null] The number of pixels that the user must move their finger back from the original swipe direction to cancel the gesture.
     * @property {int} [pinchThreshold=20] The number of pixels that the user must pinch their finger by before it is considered a pinch.
     * @property {int} [maxTimeThreshold=null] Time, in milliseconds, between touchStart and touchEnd must NOT exceed in order to be considered a swipe.
     * @property {int} [fingerReleaseThreshold=250] Time in milliseconds between releasing multiple fingers.  If 2 fingers are down, and are released one after the other, if they are within this threshold, it counts as a simultaneous release.
     * @property {int} [longTapThreshold=500] Time in milliseconds between tap and release for a long tap
     * @property {int} [doubleTapThreshold=200] Time in milliseconds between 2 taps to count as a double tap
     * @property {function} [swipe=null] A handler to catch all swipes. See {@link $.fn.swipe#event:swipe}
     * @property {function} [swipeLeft=null] A handler that is triggered for "left" swipes. See {@link $.fn.swipe#event:swipeLeft}
     * @property {function} [swipeRight=null] A handler that is triggered for "right" swipes. See {@link $.fn.swipe#event:swipeRight}
     * @property {function} [swipeUp=null] A handler that is triggered for "up" swipes. See {@link $.fn.swipe#event:swipeUp}
     * @property {function} [swipeDown=null] A handler that is triggered for "down" swipes. See {@link $.fn.swipe#event:swipeDown}
     * @property {function} [swipeStatus=null] A handler triggered for every phase of the swipe. See {@link $.fn.swipe#event:swipeStatus}
     * @property {function} [pinchIn=null] A handler triggered for pinch in events. See {@link $.fn.swipe#event:pinchIn}
     * @property {function} [pinchOut=null] A handler triggered for pinch out events. See {@link $.fn.swipe#event:pinchOut}
     * @property {function} [pinchStatus=null] A handler triggered for every phase of a pinch. See {@link $.fn.swipe#event:pinchStatus}
     * @property {function} [tap=null] A handler triggered when a user just taps on the item, rather than swipes it. If they do not move, tap is triggered, if they do move, it is not.
     * @property {function} [doubleTap=null] A handler triggered when a user double taps on the item. The delay between taps can be set with the doubleTapThreshold property. See {@link $.fn.swipe.defaults#doubleTapThreshold}
     * @property {function} [longTap=null] A handler triggered when a user long taps on the item. The delay between start and end can be set with the longTapThreshold property. See {@link $.fn.swipe.defaults#longTapThreshold}
     * @property (function) [hold=null] A handler triggered when a user reaches longTapThreshold on the item. See {@link $.fn.swipe.defaults#longTapThreshold}
     * @property {boolean} [triggerOnTouchEnd=true] If true, the swipe events are triggered when the touch end event is received (user releases finger).  If false, it will be triggered on reaching the threshold, and then cancel the touch event automatically.
     * @property {boolean} [triggerOnTouchLeave=false] If true, then when the user leaves the swipe object, the swipe will end and trigger appropriate handlers.
     * @property {string|undefined} [allowPageScroll='auto'] How the browser handles page scrolls when the user is swiping on a touchSwipe object. See {@link $.fn.swipe.pageScroll}.  <br/><br/>
     <code>"auto"</code> : all undefined swipes will cause the page to scroll in that direction. <br/>
     <code>"none"</code> : the page will not scroll when user swipes. <br/>
     <code>"horizontal"</code> : will force page to scroll on horizontal swipes. <br/>
     <code>"vertical"</code> : will force page to scroll on vertical swipes. <br/>
     * @property {boolean} [fallbackToMouseEvents=true] If true mouse events are used when run on a non touch device, false will stop swipes being triggered by mouse events on non tocuh devices.
     * @property {string} [excludedElements="button, input, select, textarea, a, .noSwipe"] A jquery selector that specifies child elements that do NOT trigger swipes. By default this excludes all form, input, select, button, anchor and .noSwipe elements.
     * @property {boolean} [preventDefaultEvents=true] by default default events are cancelled, so the page doesn't move.  You can dissable this so both native events fire as well as your handlers.

     */
    var defaults = {
        fingers: 1,
        threshold: 75,
        cancelThreshold:null,
        pinchThreshold:20,
        maxTimeThreshold: null,
        fingerReleaseThreshold:250,
        longTapThreshold:500,
        doubleTapThreshold:200,
        swipe: null,
        swipeLeft: null,
        swipeRight: null,
        swipeUp: null,
        swipeDown: null,
        swipeStatus: null,
        pinchIn:null,
        pinchOut:null,
        pinchStatus:null,
        click:null, //Deprecated since 1.6.2
        tap:null,
        doubleTap:null,
        longTap:null,
        hold:null,
        triggerOnTouchEnd: true,
        triggerOnTouchLeave:false,
        allowPageScroll: "auto",
        fallbackToMouseEvents: true,
        excludedElements:"label, button, input, select, textarea, a, .noSwipe",
        preventDefaultEvents:true
    };



    /**
     * Applies TouchSwipe behaviour to one or more jQuery objects.
     * The TouchSwipe plugin can be instantiated via this method, or methods within
     * TouchSwipe can be executed via this method as per jQuery plugin architecture.
     * @see TouchSwipe
     * @class
     * @param {Mixed} method If the current DOMNode is a TouchSwipe object, and <code>method</code> is a TouchSwipe method, then
     * the <code>method</code> is executed, and any following arguments are passed to the TouchSwipe method.
     * If <code>method</code> is an object, then the TouchSwipe class is instantiated on the current DOMNode, passing the
     * configuration properties defined in the object. See TouchSwipe
     *
     */
    $.fn.swipe = function (method) {
        var $this = $(this),
            plugin = $this.data(PLUGIN_NS);

        //Check if we are already instantiated and trying to execute a method
        if (plugin && typeof method === 'string') {
            if (plugin[method]) {
                return plugin[method].apply(this, Array.prototype.slice.call(arguments, 1));
            } else {
                $.error('Method ' + method + ' does not exist on jQuery.swipe');
            }
        }
        //Else not instantiated and trying to pass init object (or nothing)
        else if (!plugin && (typeof method === 'object' || !method)) {
            return init.apply(this, arguments);
        }

        return $this;
    };

    //Expose our defaults so a user could override the plugin defaults
    $.fn.swipe.defaults = defaults;

    /**
     * The phases that a touch event goes through.  The <code>phase</code> is passed to the event handlers.
     * These properties are read only, attempting to change them will not alter the values passed to the event handlers.
     * @namespace
     * @readonly
     * @property {string} PHASE_START Constant indicating the start phase of the touch event. Value is <code>"start"</code>.
     * @property {string} PHASE_MOVE Constant indicating the move phase of the touch event. Value is <code>"move"</code>.
     * @property {string} PHASE_END Constant indicating the end phase of the touch event. Value is <code>"end"</code>.
     * @property {string} PHASE_CANCEL Constant indicating the cancel phase of the touch event. Value is <code>"cancel"</code>.
     */
    $.fn.swipe.phases = {
        PHASE_START: PHASE_START,
        PHASE_MOVE: PHASE_MOVE,
        PHASE_END: PHASE_END,
        PHASE_CANCEL: PHASE_CANCEL
    };

    /**
     * The direction constants that are passed to the event handlers.
     * These properties are read only, attempting to change them will not alter the values passed to the event handlers.
     * @namespace
     * @readonly
     * @property {string} LEFT Constant indicating the left direction. Value is <code>"left"</code>.
     * @property {string} RIGHT Constant indicating the right direction. Value is <code>"right"</code>.
     * @property {string} UP Constant indicating the up direction. Value is <code>"up"</code>.
     * @property {string} DOWN Constant indicating the down direction. Value is <code>"cancel"</code>.
     * @property {string} IN Constant indicating the in direction. Value is <code>"in"</code>.
     * @property {string} OUT Constant indicating the out direction. Value is <code>"out"</code>.
     */
    $.fn.swipe.directions = {
        LEFT: LEFT,
        RIGHT: RIGHT,
        UP: UP,
        DOWN: DOWN,
        IN : IN,
        OUT: OUT
    };

    /**
     * The page scroll constants that can be used to set the value of <code>allowPageScroll</code> option
     * These properties are read only
     * @namespace
     * @readonly
     * @see $.fn.swipe.defaults#allowPageScroll
     * @property {string} NONE Constant indicating no page scrolling is allowed. Value is <code>"none"</code>.
     * @property {string} HORIZONTAL Constant indicating horizontal page scrolling is allowed. Value is <code>"horizontal"</code>.
     * @property {string} VERTICAL Constant indicating vertical page scrolling is allowed. Value is <code>"vertical"</code>.
     * @property {string} AUTO Constant indicating either horizontal or vertical will be allowed, depending on the swipe handlers registered. Value is <code>"auto"</code>.
     */
    $.fn.swipe.pageScroll = {
        NONE: NONE,
        HORIZONTAL: HORIZONTAL,
        VERTICAL: VERTICAL,
        AUTO: AUTO
    };

    /**
     * Constants representing the number of fingers used in a swipe.  These are used to set both the value of <code>fingers</code> in the
     * options object, as well as the value of the <code>fingers</code> event property.
     * These properties are read only, attempting to change them will not alter the values passed to the event handlers.
     * @namespace
     * @readonly
     * @see $.fn.swipe.defaults#fingers
     * @property {string} ONE Constant indicating 1 finger is to be detected / was detected. Value is <code>1</code>.
     * @property {string} TWO Constant indicating 2 fingers are to be detected / were detected. Value is <code>1</code>.
     * @property {string} THREE Constant indicating 3 finger are to be detected / were detected. Value is <code>1</code>.
     * @property {string} ALL Constant indicating any combination of finger are to be detected.  Value is <code>"all"</code>.
     */
    $.fn.swipe.fingers = {
        ONE: 1,
        TWO: 2,
        THREE: 3,
        ALL: ALL_FINGERS
    };

    /**
     * Initialise the plugin for each DOM element matched
     * This creates a new instance of the main TouchSwipe class for each DOM element, and then
     * saves a reference to that instance in the elements data property.
     * @internal
     */
    function init(options) {
        //Prep and extend the options
        if (options && (options.allowPageScroll === undefined && (options.swipe !== undefined || options.swipeStatus !== undefined))) {
            options.allowPageScroll = NONE;
        }

        //Check for deprecated options
        //Ensure that any old click handlers are assigned to the new tap, unless we have a tap
        if(options.click!==undefined && options.tap===undefined) {
            options.tap = options.click;
        }

        if (!options) {
            options = {};
        }

        //pass empty object so we dont modify the defaults
        options = $.extend({}, $.fn.swipe.defaults, options);

        //For each element instantiate the plugin
        return this.each(function () {
            var $this = $(this);

            //Check we havent already initialised the plugin
            var plugin = $this.data(PLUGIN_NS);

            if (!plugin) {
                plugin = new TouchSwipe(this, options);
                $this.data(PLUGIN_NS, plugin);
            }
        });
    }

    /**
     * Main TouchSwipe Plugin Class.
     * Do not use this to construct your TouchSwipe object, use the jQuery plugin method $.fn.swipe(); {@link $.fn.swipe}
     * @private
     * @name TouchSwipe
     * @param {DOMNode} element The HTML DOM object to apply to plugin to
     * @param {Object} options The options to configure the plugin with.  @link {$.fn.swipe.defaults}
     * @see $.fh.swipe.defaults
     * @see $.fh.swipe
     * @class
     */
    function TouchSwipe(element, options) {
        var useTouchEvents = (SUPPORTS_TOUCH || SUPPORTS_POINTER || !options.fallbackToMouseEvents),
            START_EV = useTouchEvents ? (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerDown' : 'pointerdown') : 'touchstart') : 'mousedown',
            MOVE_EV = useTouchEvents ? (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerMove' : 'pointermove') : 'touchmove') : 'mousemove',
            END_EV = useTouchEvents ? (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerUp' : 'pointerup') : 'touchend') : 'mouseup',
            LEAVE_EV = useTouchEvents ? null : 'mouseleave', //we manually detect leave on touch devices, so null event here
            CANCEL_EV = (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerCancel' : 'pointercancel') : 'touchcancel');



        //touch properties
        var distance = 0,
            direction = null,
            duration = 0,
            startTouchesDistance = 0,
            endTouchesDistance = 0,
            pinchZoom = 1,
            pinchDistance = 0,
            pinchDirection = 0,
            maximumsMap=null;



        //jQuery wrapped element for this instance
        var $element = $(element);

        //Current phase of th touch cycle
        var phase = "start";

        // the current number of fingers being used.
        var fingerCount = 0;

        //track mouse points / delta
        var fingerData=null;

        //track times
        var startTime = 0,
            endTime = 0,
            previousTouchEndTime=0,
            previousTouchFingerCount=0,
            doubleTapStartTime=0;

        //Timeouts
        var singleTapTimeout=null,
            holdTimeout=null;

        // Add gestures to all swipable areas if supported
        try {
            $element.bind(START_EV, touchStart);
            $element.bind(CANCEL_EV, touchCancel);
        }
        catch (e) {
            $.error('events not supported ' + START_EV + ',' + CANCEL_EV + ' on jQuery.swipe');
        }

        //
        //Public methods
        //

        /**
         * re-enables the swipe plugin with the previous configuration
         * @function
         * @name $.fn.swipe#enable
         * @return {DOMNode} The Dom element that was registered with TouchSwipe
         * @example $("#element").swipe("enable");
         */
        this.enable = function () {
            $element.bind(START_EV, touchStart);
            $element.bind(CANCEL_EV, touchCancel);
            return $element;
        };

        /**
         * disables the swipe plugin
         * @function
         * @name $.fn.swipe#disable
         * @return {DOMNode} The Dom element that is now registered with TouchSwipe
         * @example $("#element").swipe("disable");
         */
        this.disable = function () {
            removeListeners();
            return $element;
        };

        /**
         * Destroy the swipe plugin completely. To use any swipe methods, you must re initialise the plugin.
         * @function
         * @name $.fn.swipe#destroy
         * @example $("#element").swipe("destroy");
         */
        this.destroy = function () {
            removeListeners();
            $element.data(PLUGIN_NS, null);
            $element = null;
        };


        /**
         * Allows run time updating of the swipe configuration options.
         * @function
         * @name $.fn.swipe#option
         * @param {String} property The option property to get or set
         * @param {Object} [value] The value to set the property to
         * @return {Object} If only a property name is passed, then that property value is returned.
         * @example $("#element").swipe("option", "threshold"); // return the threshold
         * @example $("#element").swipe("option", "threshold", 100); // set the threshold after init
         * @see $.fn.swipe.defaults
         *
         */
        this.option = function (property, value) {
            if(options[property]!==undefined) {
                if(value===undefined) {
                    return options[property];
                } else {
                    options[property] = value;
                }
            } else {
                $.error('Option ' + property + ' does not exist on jQuery.swipe.options');
            }

            return null;
        }

        //
        // Private methods
        //

        //
        // EVENTS
        //
        /**
         * Event handler for a touch start event.
         * Stops the default click event from triggering and stores where we touched
         * @inner
         * @param {object} jqEvent The normalised jQuery event object.
         */
        function touchStart(jqEvent) {
            //If we already in a touch event (a finger already in use) then ignore subsequent ones..
            if( getTouchInProgress() )
                return;

            //Check if this element matches any in the excluded elements selectors,  or its parent is excluded, if so, DON'T swipe
            if( $(jqEvent.target).closest( options.excludedElements, $element ).length>0 )
                return;

            //As we use Jquery bind for events, we need to target the original event object
            //If these events are being programmatically triggered, we don't have an original event object, so use the Jq one.
            var event = jqEvent.originalEvent ? jqEvent.originalEvent : jqEvent;

            var ret,
                evt = SUPPORTS_TOUCH ? event.touches[0] : event;

            phase = PHASE_START;

            //If we support touches, get the finger count
            if (SUPPORTS_TOUCH) {
                // get the total number of fingers touching the screen
                fingerCount = event.touches.length;
            }
            //Else this is the desktop, so stop the browser from dragging content
            else {
                jqEvent.preventDefault(); //call this on jq event so we are cross browser
            }

            //clear vars..
            distance = 0;
            direction = null;
            pinchDirection=null;
            duration = 0;
            startTouchesDistance=0;
            endTouchesDistance=0;
            pinchZoom = 1;
            pinchDistance = 0;
            fingerData=createAllFingerData();
            maximumsMap=createMaximumsData();
            cancelMultiFingerRelease();


            // check the number of fingers is what we are looking for, or we are capturing pinches
            if (!SUPPORTS_TOUCH || (fingerCount === options.fingers || options.fingers === ALL_FINGERS) || hasPinches()) {
                // get the coordinates of the touch
                createFingerData( 0, evt );
                startTime = getTimeStamp();

                if(fingerCount==2) {
                    //Keep track of the initial pinch distance, so we can calculate the diff later
                    //Store second finger data as start
                    createFingerData( 1, event.touches[1] );
                    startTouchesDistance = endTouchesDistance = calculateTouchesDistance(fingerData[0].start, fingerData[1].start);
                }

                if (options.swipeStatus || options.pinchStatus) {
                    ret = triggerHandler(event, phase);
                }
            }
            else {
                //A touch with more or less than the fingers we are looking for, so cancel
                ret = false;
            }

            //If we have a return value from the users handler, then return and cancel
            if (ret === false) {
                phase = PHASE_CANCEL;
                triggerHandler(event, phase);
                return ret;
            }
            else {
                if (options.hold) {
                    holdTimeout = setTimeout($.proxy(function() {
                        //Trigger the event
                        $element.trigger('hold', [event.target]);
                        //Fire the callback
                        if(options.hold) {
                            ret = options.hold.call($element, event, event.target);
                        }
                    }, this), options.longTapThreshold );
                }

                setTouchInProgress(true);
            }

            return null;
        };



        /**
         * Event handler for a touch move event.
         * If we change fingers during move, then cancel the event
         * @inner
         * @param {object} jqEvent The normalised jQuery event object.
         */
        function touchMove(jqEvent) {

            //As we use Jquery bind for events, we need to target the original event object
            //If these events are being programmatically triggered, we don't have an original event object, so use the Jq one.
            var event = jqEvent.originalEvent ? jqEvent.originalEvent : jqEvent;

            //If we are ending, cancelling, or within the threshold of 2 fingers being released, don't track anything..
            if (phase === PHASE_END || phase === PHASE_CANCEL || inMultiFingerRelease())
                return;

            var ret,
                evt = SUPPORTS_TOUCH ? event.touches[0] : event;


            //Update the  finger data
            var currentFinger = updateFingerData(evt);
            endTime = getTimeStamp();

            if (SUPPORTS_TOUCH) {
                fingerCount = event.touches.length;
            }

            if (options.hold)
                clearTimeout(holdTimeout);

            phase = PHASE_MOVE;

            //If we have 2 fingers get Touches distance as well
            if(fingerCount==2) {

                //Keep track of the initial pinch distance, so we can calculate the diff later
                //We do this here as well as the start event, in case they start with 1 finger, and the press 2 fingers
                if(startTouchesDistance==0) {
                    //Create second finger if this is the first time...
                    createFingerData( 1, event.touches[1] );

                    startTouchesDistance = endTouchesDistance = calculateTouchesDistance(fingerData[0].start, fingerData[1].start);
                } else {
                    //Else just update the second finger
                    updateFingerData(event.touches[1]);

                    endTouchesDistance = calculateTouchesDistance(fingerData[0].end, fingerData[1].end);
                    pinchDirection = calculatePinchDirection(fingerData[0].end, fingerData[1].end);
                }


                pinchZoom = calculatePinchZoom(startTouchesDistance, endTouchesDistance);
                pinchDistance = Math.abs(startTouchesDistance - endTouchesDistance);
            }




            if ( (fingerCount === options.fingers || options.fingers === ALL_FINGERS) || !SUPPORTS_TOUCH || hasPinches() ) {

                direction = calculateDirection(currentFinger.start, currentFinger.end);

                //Check if we need to prevent default event (page scroll / pinch zoom) or not
                validateDefaultEvent(jqEvent, direction);

                //Distance and duration are all off the main finger
                distance = calculateDistance(currentFinger.start, currentFinger.end);
                duration = calculateDuration();

                //Cache the maximum distance we made in this direction
                setMaxDistance(direction, distance);


                if (options.swipeStatus || options.pinchStatus) {
                    ret = triggerHandler(event, phase);
                }


                //If we trigger end events when threshold are met, or trigger events when touch leaves element
                if(!options.triggerOnTouchEnd || options.triggerOnTouchLeave) {

                    var inBounds = true;

                    //If checking if we leave the element, run the bounds check (we can use touchleave as its not supported on webkit)
                    if(options.triggerOnTouchLeave) {
                        var bounds = getbounds( this );
                        inBounds = isInBounds( currentFinger.end, bounds );
                    }

                    //Trigger end handles as we swipe if thresholds met or if we have left the element if the user has asked to check these..
                    if(!options.triggerOnTouchEnd && inBounds) {
                        phase = getNextPhase( PHASE_MOVE );
                    }
                    //We end if out of bounds here, so set current phase to END, and check if its modified
                    else if(options.triggerOnTouchLeave && !inBounds ) {
                        phase = getNextPhase( PHASE_END );
                    }

                    if(phase==PHASE_CANCEL || phase==PHASE_END)	{
                        triggerHandler(event, phase);
                    }
                }
            }
            else {
                phase = PHASE_CANCEL;
                triggerHandler(event, phase);
            }

            if (ret === false) {
                phase = PHASE_CANCEL;
                triggerHandler(event, phase);
            }
        }



        /**
         * Event handler for a touch end event.
         * Calculate the direction and trigger events
         * @inner
         * @param {object} jqEvent The normalised jQuery event object.
         */
        function touchEnd(jqEvent) {
            //As we use Jquery bind for events, we need to target the original event object
            var event = jqEvent.originalEvent;


            //If we are still in a touch with another finger return
            //This allows us to wait a fraction and see if the other finger comes up, if it does within the threshold, then we treat it as a multi release, not a single release.
            if (SUPPORTS_TOUCH) {
                if(event.touches.length>0) {
                    startMultiFingerRelease();
                    return true;
                }
            }

            //If a previous finger has been released, check how long ago, if within the threshold, then assume it was a multifinger release.
            //This is used to allow 2 fingers to release fractionally after each other, whilst maintainig the event as containg 2 fingers, not 1
            if(inMultiFingerRelease()) {
                fingerCount=previousTouchFingerCount;
            }

            //Set end of swipe
            endTime = getTimeStamp();

            //Get duration incase move was never fired
            duration = calculateDuration();

            //If we trigger handlers at end of swipe OR, we trigger during, but they didnt trigger and we are still in the move phase
            if(didSwipeBackToCancel() || !validateSwipeDistance()) {
                phase = PHASE_CANCEL;
                triggerHandler(event, phase);
            } else if (options.triggerOnTouchEnd || (options.triggerOnTouchEnd == false && phase === PHASE_MOVE)) {
                //call this on jq event so we are cross browser
                jqEvent.preventDefault();
                phase = PHASE_END;
                triggerHandler(event, phase);
            }
            //Special cases - A tap should always fire on touch end regardless,
            //So here we manually trigger the tap end handler by itself
            //We dont run trigger handler as it will re-trigger events that may have fired already
            else if (!options.triggerOnTouchEnd && hasTap()) {
                //Trigger the pinch events...
                phase = PHASE_END;
                triggerHandlerForGesture(event, phase, TAP);
            }
            else if (phase === PHASE_MOVE) {
                phase = PHASE_CANCEL;
                triggerHandler(event, phase);
            }

            setTouchInProgress(false);

            return null;
        }



        /**
         * Event handler for a touch cancel event.
         * Clears current vars
         * @inner
         */
        function touchCancel() {
            // reset the variables back to default values
            fingerCount = 0;
            endTime = 0;
            startTime = 0;
            startTouchesDistance=0;
            endTouchesDistance=0;
            pinchZoom=1;

            //If we were in progress of tracking a possible multi touch end, then re set it.
            cancelMultiFingerRelease();

            setTouchInProgress(false);
        }


        /**
         * Event handler for a touch leave event.
         * This is only triggered on desktops, in touch we work this out manually
         * as the touchleave event is not supported in webkit
         * @inner
         */
        function touchLeave(jqEvent) {
            var event = jqEvent.originalEvent;

            //If we have the trigger on leave property set....
            if(options.triggerOnTouchLeave) {
                phase = getNextPhase( PHASE_END );
                triggerHandler(event, phase);
            }
        }

        /**
         * Removes all listeners that were associated with the plugin
         * @inner
         */
        function removeListeners() {
            $element.unbind(START_EV, touchStart);
            $element.unbind(CANCEL_EV, touchCancel);
            $element.unbind(MOVE_EV, touchMove);
            $element.unbind(END_EV, touchEnd);

            //we only have leave events on desktop, we manually calculate leave on touch as its not supported in webkit
            if(LEAVE_EV) {
                $element.unbind(LEAVE_EV, touchLeave);
            }

            setTouchInProgress(false);
        }


        /**
         * Checks if the time and distance thresholds have been met, and if so then the appropriate handlers are fired.
         */
        function getNextPhase(currentPhase) {

            var nextPhase = currentPhase;

            // Ensure we have valid swipe (under time and over distance  and check if we are out of bound...)
            var validTime = validateSwipeTime();
            var validDistance = validateSwipeDistance();
            var didCancel = didSwipeBackToCancel();

            //If we have exceeded our time, then cancel
            if(!validTime || didCancel) {
                nextPhase = PHASE_CANCEL;
            }
            //Else if we are moving, and have reached distance then end
            else if (validDistance && currentPhase == PHASE_MOVE && (!options.triggerOnTouchEnd || options.triggerOnTouchLeave) ) {
                nextPhase = PHASE_END;
            }
            //Else if we have ended by leaving and didn't reach distance, then cancel
            else if (!validDistance && currentPhase==PHASE_END && options.triggerOnTouchLeave) {
                nextPhase = PHASE_CANCEL;
            }

            return nextPhase;
        }


        /**
         * Trigger the relevant event handler
         * The handlers are passed the original event, the element that was swiped, and in the case of the catch all handler, the direction that was swiped, "left", "right", "up", or "down"
         * @param {object} event the original event object
         * @param {string} phase the phase of the swipe (start, end cancel etc) {@link $.fn.swipe.phases}
         * @inner
         */
        function triggerHandler(event, phase) {

            var ret = undefined;

            //Swipes and pinches are not mutually exclusive - can happend at same time, so need to trigger 2 events potentially
            if( (didSwipe() || hasSwipes()) || (didPinch() || hasPinches()) ) {
                // SWIPE GESTURES
                if(didSwipe() || hasSwipes()) { //hasSwipes as status needs to fire even if swipe is invalid
                    //Trigger the swipe events...
                    ret = triggerHandlerForGesture(event, phase, SWIPE);
                }

                // PINCH GESTURES (if the above didn't cancel)
                if((didPinch() || hasPinches()) && ret!==false) {
                    //Trigger the pinch events...
                    ret = triggerHandlerForGesture(event, phase, PINCH);
                }
            } else {

                // CLICK / TAP (if the above didn't cancel)
                if(didDoubleTap() && ret!==false) {
                    //Trigger the tap events...
                    ret = triggerHandlerForGesture(event, phase, DOUBLE_TAP);
                }

                // CLICK / TAP (if the above didn't cancel)
                else if(didLongTap() && ret!==false) {
                    //Trigger the tap events...
                    ret = triggerHandlerForGesture(event, phase, LONG_TAP);
                }

                // CLICK / TAP (if the above didn't cancel)
                else if(didTap() && ret!==false) {
                    //Trigger the tap event..
                    ret = triggerHandlerForGesture(event, phase, TAP);
                }
            }



            // If we are cancelling the gesture, then manually trigger the reset handler
            if (phase === PHASE_CANCEL) {
                touchCancel(event);
            }

            // If we are ending the gesture, then manually trigger the reset handler IF all fingers are off
            if(phase === PHASE_END) {
                //If we support touch, then check that all fingers are off before we cancel
                if (SUPPORTS_TOUCH) {
                    if(event.touches.length==0) {
                        touchCancel(event);
                    }
                }
                else {
                    touchCancel(event);
                }
            }

            return ret;
        }



        /**
         * Trigger the relevant event handler
         * The handlers are passed the original event, the element that was swiped, and in the case of the catch all handler, the direction that was swiped, "left", "right", "up", or "down"
         * @param {object} event the original event object
         * @param {string} phase the phase of the swipe (start, end cancel etc) {@link $.fn.swipe.phases}
         * @param {string} gesture the gesture to trigger a handler for : PINCH or SWIPE {@link $.fn.swipe.gestures}
         * @return Boolean False, to indicate that the event should stop propagation, or void.
         * @inner
         */
        function triggerHandlerForGesture(event, phase, gesture) {

            var ret=undefined;

            //SWIPES....
            if(gesture==SWIPE) {
                //Trigger status every time..

                //Trigger the event...
                $element.trigger('swipeStatus', [phase, direction || null, distance || 0, duration || 0, fingerCount, fingerData]);

                //Fire the callback
                if (options.swipeStatus) {
                    ret = options.swipeStatus.call($element, event, phase, direction || null, distance || 0, duration || 0, fingerCount, fingerData);
                    //If the status cancels, then dont run the subsequent event handlers..
                    if(ret===false) return false;
                }




                if (phase == PHASE_END && validateSwipe()) {
                    //Fire the catch all event
                    $element.trigger('swipe', [direction, distance, duration, fingerCount, fingerData]);

                    //Fire catch all callback
                    if (options.swipe) {
                        ret = options.swipe.call($element, event, direction, distance, duration, fingerCount, fingerData);
                        //If the status cancels, then dont run the subsequent event handlers..
                        if(ret===false) return false;
                    }

                    //trigger direction specific event handlers
                    switch (direction) {
                        case LEFT:
                            //Trigger the event
                            $element.trigger('swipeLeft', [direction, distance, duration, fingerCount, fingerData]);

                            //Fire the callback
                            if (options.swipeLeft) {
                                ret = options.swipeLeft.call($element, event, direction, distance, duration, fingerCount, fingerData);
                            }
                            break;

                        case RIGHT:
                            //Trigger the event
                            $element.trigger('swipeRight', [direction, distance, duration, fingerCount, fingerData]);

                            //Fire the callback
                            if (options.swipeRight) {
                                ret = options.swipeRight.call($element, event, direction, distance, duration, fingerCount, fingerData);
                            }
                            break;

                        case UP:
                            //Trigger the event
                            $element.trigger('swipeUp', [direction, distance, duration, fingerCount, fingerData]);

                            //Fire the callback
                            if (options.swipeUp) {
                                ret = options.swipeUp.call($element, event, direction, distance, duration, fingerCount, fingerData);
                            }
                            break;

                        case DOWN:
                            //Trigger the event
                            $element.trigger('swipeDown', [direction, distance, duration, fingerCount, fingerData]);

                            //Fire the callback
                            if (options.swipeDown) {
                                ret = options.swipeDown.call($element, event, direction, distance, duration, fingerCount, fingerData);
                            }
                            break;
                    }
                }
            }


            //PINCHES....
            if(gesture==PINCH) {
                //Trigger the event
                $element.trigger('pinchStatus', [phase, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData]);

                //Fire the callback
                if (options.pinchStatus) {
                    ret = options.pinchStatus.call($element, event, phase, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData);
                    //If the status cancels, then dont run the subsequent event handlers..
                    if(ret===false) return false;
                }

                if(phase==PHASE_END && validatePinch()) {

                    switch (pinchDirection) {
                        case IN:
                            //Trigger the event
                            $element.trigger('pinchIn', [pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData]);

                            //Fire the callback
                            if (options.pinchIn) {
                                ret = options.pinchIn.call($element, event, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData);
                            }
                            break;

                        case OUT:
                            //Trigger the event
                            $element.trigger('pinchOut', [pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData]);

                            //Fire the callback
                            if (options.pinchOut) {
                                ret = options.pinchOut.call($element, event, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData);
                            }
                            break;
                    }
                }
            }





            if(gesture==TAP) {
                if(phase === PHASE_CANCEL || phase === PHASE_END) {


                    //Cancel any existing double tap
                    clearTimeout(singleTapTimeout);
                    //Cancel hold timeout
                    clearTimeout(holdTimeout);

                    //If we are also looking for doubelTaps, wait incase this is one...
                    if(hasDoubleTap() && !inDoubleTap()) {
                        //Cache the time of this tap
                        doubleTapStartTime = getTimeStamp();

                        //Now wait for the double tap timeout, and trigger this single tap
                        //if its not cancelled by a double tap
                        singleTapTimeout = setTimeout($.proxy(function() {
                            doubleTapStartTime=null;
                            //Trigger the event
                            $element.trigger('tap', [event.target]);


                            //Fire the callback
                            if(options.tap) {
                                ret = options.tap.call($element, event, event.target);
                            }
                        }, this), options.doubleTapThreshold );

                    } else {
                        doubleTapStartTime=null;

                        //Trigger the event
                        $element.trigger('tap', [event.target]);


                        //Fire the callback
                        if(options.tap) {
                            ret = options.tap.call($element, event, event.target);
                        }
                    }
                }
            }

            else if (gesture==DOUBLE_TAP) {
                if(phase === PHASE_CANCEL || phase === PHASE_END) {
                    //Cancel any pending singletap
                    clearTimeout(singleTapTimeout);
                    doubleTapStartTime=null;

                    //Trigger the event
                    $element.trigger('doubletap', [event.target]);

                    //Fire the callback
                    if(options.doubleTap) {
                        ret = options.doubleTap.call($element, event, event.target);
                    }
                }
            }

            else if (gesture==LONG_TAP) {
                if(phase === PHASE_CANCEL || phase === PHASE_END) {
                    //Cancel any pending singletap (shouldnt be one)
                    clearTimeout(singleTapTimeout);
                    doubleTapStartTime=null;

                    //Trigger the event
                    $element.trigger('longtap', [event.target]);

                    //Fire the callback
                    if(options.longTap) {
                        ret = options.longTap.call($element, event, event.target);
                    }
                }
            }

            return ret;
        }




        //
        // GESTURE VALIDATION
        //

        /**
         * Checks the user has swipe far enough
         * @return Boolean if <code>threshold</code> has been set, return true if the threshold was met, else false.
         * If no threshold was set, then we return true.
         * @inner
         */
        function validateSwipeDistance() {
            var valid = true;
            //If we made it past the min swipe distance..
            if (options.threshold !== null) {
                valid = distance >= options.threshold;
            }

            return valid;
        }

        /**
         * Checks the user has swiped back to cancel.
         * @return Boolean if <code>cancelThreshold</code> has been set, return true if the cancelThreshold was met, else false.
         * If no cancelThreshold was set, then we return true.
         * @inner
         */
        function didSwipeBackToCancel() {
            var cancelled = false;
            if(options.cancelThreshold !== null && direction !==null)  {
                cancelled =  (getMaxDistance( direction ) - distance) >= options.cancelThreshold;
            }

            return cancelled;
        }

        /**
         * Checks the user has pinched far enough
         * @return Boolean if <code>pinchThreshold</code> has been set, return true if the threshold was met, else false.
         * If no threshold was set, then we return true.
         * @inner
         */
        function validatePinchDistance() {
            if (options.pinchThreshold !== null) {
                return pinchDistance >= options.pinchThreshold;
            }
            return true;
        }

        /**
         * Checks that the time taken to swipe meets the minimum / maximum requirements
         * @return Boolean
         * @inner
         */
        function validateSwipeTime() {
            var result;
            //If no time set, then return true

            if (options.maxTimeThreshold) {
                if (duration >= options.maxTimeThreshold) {
                    result = false;
                } else {
                    result = true;
                }
            }
            else {
                result = true;
            }

            return result;
        }



        /**
         * Checks direction of the swipe and the value allowPageScroll to see if we should allow or prevent the default behaviour from occurring.
         * This will essentially allow page scrolling or not when the user is swiping on a touchSwipe object.
         * @param {object} jqEvent The normalised jQuery representation of the event object.
         * @param {string} direction The direction of the event. See {@link $.fn.swipe.directions}
         * @see $.fn.swipe.directions
         * @inner
         */
        function validateDefaultEvent(jqEvent, direction) {


            if( options.preventDefaultEvents === false ) {
                return;
            }

            if (options.allowPageScroll === NONE) {
                jqEvent.preventDefault();
            } else {
                var auto = options.allowPageScroll === AUTO;

                switch (direction) {
                    case LEFT:
                        if ((options.swipeLeft && auto) || (!auto && options.allowPageScroll != HORIZONTAL)) {
                            jqEvent.preventDefault();
                        }
                        break;

                    case RIGHT:
                        if ((options.swipeRight && auto) || (!auto && options.allowPageScroll != HORIZONTAL)) {
                            jqEvent.preventDefault();
                        }
                        break;

                    case UP:
                        if ((options.swipeUp && auto) || (!auto && options.allowPageScroll != VERTICAL)) {
                            jqEvent.preventDefault();
                        }
                        break;

                    case DOWN:
                        if ((options.swipeDown && auto) || (!auto && options.allowPageScroll != VERTICAL)) {
                            jqEvent.preventDefault();
                        }
                        break;
                }
            }

        }


        // PINCHES
        /**
         * Returns true of the current pinch meets the thresholds
         * @return Boolean
         * @inner
         */
        function validatePinch() {
            var hasCorrectFingerCount = validateFingers();
            var hasEndPoint = validateEndPoint();
            var hasCorrectDistance = validatePinchDistance();
            return hasCorrectFingerCount && hasEndPoint && hasCorrectDistance;

        }

        /**
         * Returns true if any Pinch events have been registered
         * @return Boolean
         * @inner
         */
        function hasPinches() {
            //Enure we dont return 0 or null for false values
            return !!(options.pinchStatus || options.pinchIn || options.pinchOut);
        }

        /**
         * Returns true if we are detecting pinches, and have one
         * @return Boolean
         * @inner
         */
        function didPinch() {
            //Enure we dont return 0 or null for false values
            return !!(validatePinch() && hasPinches());
        }




        // SWIPES
        /**
         * Returns true if the current swipe meets the thresholds
         * @return Boolean
         * @inner
         */
        function validateSwipe() {
            //Check validity of swipe
            var hasValidTime = validateSwipeTime();
            var hasValidDistance = validateSwipeDistance();
            var hasCorrectFingerCount = validateFingers();
            var hasEndPoint = validateEndPoint();
            var didCancel = didSwipeBackToCancel();

            // if the user swiped more than the minimum length, perform the appropriate action
            // hasValidDistance is null when no distance is set
            var valid =  !didCancel && hasEndPoint && hasCorrectFingerCount && hasValidDistance && hasValidTime;

            return valid;
        }

        /**
         * Returns true if any Swipe events have been registered
         * @return Boolean
         * @inner
         */
        function hasSwipes() {
            //Enure we dont return 0 or null for false values
            return !!(options.swipe || options.swipeStatus || options.swipeLeft || options.swipeRight || options.swipeUp || options.swipeDown);
        }


        /**
         * Returns true if we are detecting swipes and have one
         * @return Boolean
         * @inner
         */
        function didSwipe() {
            //Enure we dont return 0 or null for false values
            return !!(validateSwipe() && hasSwipes());
        }

        /**
         * Returns true if we have matched the number of fingers we are looking for
         * @return Boolean
         * @inner
         */
        function validateFingers() {
            //The number of fingers we want were matched, or on desktop we ignore
            return ((fingerCount === options.fingers || options.fingers === ALL_FINGERS) || !SUPPORTS_TOUCH);
        }

        /**
         * Returns true if we have an end point for the swipe
         * @return Boolean
         * @inner
         */
        function validateEndPoint() {
            //We have an end value for the finger
            return fingerData[0].end.x !== 0;
        }

        // TAP / CLICK
        /**
         * Returns true if a click / tap events have been registered
         * @return Boolean
         * @inner
         */
        function hasTap() {
            //Enure we dont return 0 or null for false values
            return !!(options.tap) ;
        }

        /**
         * Returns true if a double tap events have been registered
         * @return Boolean
         * @inner
         */
        function hasDoubleTap() {
            //Enure we dont return 0 or null for false values
            return !!(options.doubleTap) ;
        }

        /**
         * Returns true if any long tap events have been registered
         * @return Boolean
         * @inner
         */
        function hasLongTap() {
            //Enure we dont return 0 or null for false values
            return !!(options.longTap) ;
        }

        /**
         * Returns true if we could be in the process of a double tap (one tap has occurred, we are listening for double taps, and the threshold hasn't past.
         * @return Boolean
         * @inner
         */
        function validateDoubleTap() {
            if(doubleTapStartTime==null){
                return false;
            }
            var now = getTimeStamp();
            return (hasDoubleTap() && ((now-doubleTapStartTime) <= options.doubleTapThreshold));
        }

        /**
         * Returns true if we could be in the process of a double tap (one tap has occurred, we are listening for double taps, and the threshold hasn't past.
         * @return Boolean
         * @inner
         */
        function inDoubleTap() {
            return validateDoubleTap();
        }


        /**
         * Returns true if we have a valid tap
         * @return Boolean
         * @inner
         */
        function validateTap() {
            return ((fingerCount === 1 || !SUPPORTS_TOUCH) && (isNaN(distance) || distance < options.threshold));
        }

        /**
         * Returns true if we have a valid long tap
         * @return Boolean
         * @inner
         */
        function validateLongTap() {
            //slight threshold on moving finger
            return ((duration > options.longTapThreshold) && (distance < DOUBLE_TAP_THRESHOLD));
        }

        /**
         * Returns true if we are detecting taps and have one
         * @return Boolean
         * @inner
         */
        function didTap() {
            //Enure we dont return 0 or null for false values
            return !!(validateTap() && hasTap());
        }


        /**
         * Returns true if we are detecting double taps and have one
         * @return Boolean
         * @inner
         */
        function didDoubleTap() {
            //Enure we dont return 0 or null for false values
            return !!(validateDoubleTap() && hasDoubleTap());
        }

        /**
         * Returns true if we are detecting long taps and have one
         * @return Boolean
         * @inner
         */
        function didLongTap() {
            //Enure we dont return 0 or null for false values
            return !!(validateLongTap() && hasLongTap());
        }




        // MULTI FINGER TOUCH
        /**
         * Starts tracking the time between 2 finger releases, and keeps track of how many fingers we initially had up
         * @inner
         */
        function startMultiFingerRelease() {
            previousTouchEndTime = getTimeStamp();
            previousTouchFingerCount = event.touches.length+1;
        }

        /**
         * Cancels the tracking of time between 2 finger releases, and resets counters
         * @inner
         */
        function cancelMultiFingerRelease() {
            previousTouchEndTime = 0;
            previousTouchFingerCount = 0;
        }

        /**
         * Checks if we are in the threshold between 2 fingers being released
         * @return Boolean
         * @inner
         */
        function inMultiFingerRelease() {

            var withinThreshold = false;

            if(previousTouchEndTime) {
                var diff = getTimeStamp() - previousTouchEndTime
                if( diff<=options.fingerReleaseThreshold ) {
                    withinThreshold = true;
                }
            }

            return withinThreshold;
        }


        /**
         * gets a data flag to indicate that a touch is in progress
         * @return Boolean
         * @inner
         */
        function getTouchInProgress() {
            //strict equality to ensure only true and false are returned
            return !!($element.data(PLUGIN_NS+'_intouch') === true);
        }

        /**
         * Sets a data flag to indicate that a touch is in progress
         * @param {boolean} val The value to set the property to
         * @inner
         */
        function setTouchInProgress(val) {

            //Add or remove event listeners depending on touch status
            if(val===true) {
                $element.bind(MOVE_EV, touchMove);
                $element.bind(END_EV, touchEnd);

                //we only have leave events on desktop, we manually calcuate leave on touch as its not supported in webkit
                if(LEAVE_EV) {
                    $element.bind(LEAVE_EV, touchLeave);
                }
            } else {
                $element.unbind(MOVE_EV, touchMove, false);
                $element.unbind(END_EV, touchEnd, false);

                //we only have leave events on desktop, we manually calcuate leave on touch as its not supported in webkit
                if(LEAVE_EV) {
                    $element.unbind(LEAVE_EV, touchLeave, false);
                }
            }


            //strict equality to ensure only true and false can update the value
            $element.data(PLUGIN_NS+'_intouch', val === true);
        }


        /**
         * Creates the finger data for the touch/finger in the event object.
         * @param {int} index The index in the array to store the finger data (usually the order the fingers were pressed)
         * @param {object} evt The event object containing finger data
         * @return finger data object
         * @inner
         */
        function createFingerData( index, evt ) {
            var id = evt.identifier!==undefined ? evt.identifier : 0;

            fingerData[index].identifier = id;
            fingerData[index].start.x = fingerData[index].end.x = evt.pageX||evt.clientX;
            fingerData[index].start.y = fingerData[index].end.y = evt.pageY||evt.clientY;

            return fingerData[index];
        }

        /**
         * Updates the finger data for a particular event object
         * @param {object} evt The event object containing the touch/finger data to upadte
         * @return a finger data object.
         * @inner
         */
        function updateFingerData(evt) {

            var id = evt.identifier!==undefined ? evt.identifier : 0;
            var f = getFingerData( id );

            f.end.x = evt.pageX||evt.clientX;
            f.end.y = evt.pageY||evt.clientY;

            return f;
        }

        /**
         * Returns a finger data object by its event ID.
         * Each touch event has an identifier property, which is used
         * to track repeat touches
         * @param {int} id The unique id of the finger in the sequence of touch events.
         * @return a finger data object.
         * @inner
         */
        function getFingerData( id ) {
            for(var i=0; i<fingerData.length; i++) {
                if(fingerData[i].identifier == id) {
                    return fingerData[i];
                }
            }
        }

        /**
         * Creats all the finger onjects and returns an array of finger data
         * @return Array of finger objects
         * @inner
         */
        function createAllFingerData() {
            var fingerData=[];
            for (var i=0; i<=5; i++) {
                fingerData.push({
                    start:{ x: 0, y: 0 },
                    end:{ x: 0, y: 0 },
                    identifier:0
                });
            }

            return fingerData;
        }

        /**
         * Sets the maximum distance swiped in the given direction.
         * If the new value is lower than the current value, the max value is not changed.
         * @param {string}  direction The direction of the swipe
         * @param {int}  distance The distance of the swipe
         * @inner
         */
        function setMaxDistance(direction, distance) {
            distance = Math.max(distance, getMaxDistance(direction) );
            maximumsMap[direction].distance = distance;
        }

        /**
         * gets the maximum distance swiped in the given direction.
         * @param {string}  direction The direction of the swipe
         * @return int  The distance of the swipe
         * @inner
         */
        function getMaxDistance(direction) {
            if (maximumsMap[direction]) return maximumsMap[direction].distance;
            return undefined;
        }

        /**
         * Creats a map of directions to maximum swiped values.
         * @return Object A dictionary of maximum values, indexed by direction.
         * @inner
         */
        function createMaximumsData() {
            var maxData={};
            maxData[LEFT]=createMaximumVO(LEFT);
            maxData[RIGHT]=createMaximumVO(RIGHT);
            maxData[UP]=createMaximumVO(UP);
            maxData[DOWN]=createMaximumVO(DOWN);

            return maxData;
        }

        /**
         * Creates a map maximum swiped values for a given swipe direction
         * @param {string} The direction that these values will be associated with
         * @return Object Maximum values
         * @inner
         */
        function createMaximumVO(dir) {
            return {
                direction:dir,
                distance:0
            }
        }


        //
        // MATHS / UTILS
        //

        /**
         * Calculate the duration of the swipe
         * @return int
         * @inner
         */
        function calculateDuration() {
            return endTime - startTime;
        }

        /**
         * Calculate the distance between 2 touches (pinch)
         * @param {point} startPoint A point object containing x and y co-ordinates
         * @param {point} endPoint A point object containing x and y co-ordinates
         * @return int;
         * @inner
         */
        function calculateTouchesDistance(startPoint, endPoint) {
            var diffX = Math.abs(startPoint.x - endPoint.x);
            var diffY = Math.abs(startPoint.y - endPoint.y);

            return Math.round(Math.sqrt(diffX*diffX+diffY*diffY));
        }

        /**
         * Calculate the zoom factor between the start and end distances
         * @param {int} startDistance Distance (between 2 fingers) the user started pinching at
         * @param {int} endDistance Distance (between 2 fingers) the user ended pinching at
         * @return float The zoom value from 0 to 1.
         * @inner
         */
        function calculatePinchZoom(startDistance, endDistance) {
            var percent = (endDistance/startDistance) * 1;
            return percent.toFixed(2);
        }


        /**
         * Returns the pinch direction, either IN or OUT for the given points
         * @return string Either {@link $.fn.swipe.directions.IN} or {@link $.fn.swipe.directions.OUT}
         * @see $.fn.swipe.directions
         * @inner
         */
        function calculatePinchDirection() {
            if(pinchZoom<1) {
                return OUT;
            }
            else {
                return IN;
            }
        }


        /**
         * Calculate the length / distance of the swipe
         * @param {point} startPoint A point object containing x and y co-ordinates
         * @param {point} endPoint A point object containing x and y co-ordinates
         * @return int
         * @inner
         */
        function calculateDistance(startPoint, endPoint) {
            return Math.round(Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)));
        }

        /**
         * Calculate the angle of the swipe
         * @param {point} startPoint A point object containing x and y co-ordinates
         * @param {point} endPoint A point object containing x and y co-ordinates
         * @return int
         * @inner
         */
        function calculateAngle(startPoint, endPoint) {
            var x = startPoint.x - endPoint.x;
            var y = endPoint.y - startPoint.y;
            var r = Math.atan2(y, x); //radians
            var angle = Math.round(r * 180 / Math.PI); //degrees

            //ensure value is positive
            if (angle < 0) {
                angle = 360 - Math.abs(angle);
            }

            return angle;
        }

        /**
         * Calculate the direction of the swipe
         * This will also call calculateAngle to get the latest angle of swipe
         * @param {point} startPoint A point object containing x and y co-ordinates
         * @param {point} endPoint A point object containing x and y co-ordinates
         * @return string Either {@link $.fn.swipe.directions.LEFT} / {@link $.fn.swipe.directions.RIGHT} / {@link $.fn.swipe.directions.DOWN} / {@link $.fn.swipe.directions.UP}
         * @see $.fn.swipe.directions
         * @inner
         */
        function calculateDirection(startPoint, endPoint ) {
            var angle = calculateAngle(startPoint, endPoint);

            if ((angle <= 45) && (angle >= 0)) {
                return LEFT;
            } else if ((angle <= 360) && (angle >= 315)) {
                return LEFT;
            } else if ((angle >= 135) && (angle <= 225)) {
                return RIGHT;
            } else if ((angle > 45) && (angle < 135)) {
                return DOWN;
            } else {
                return UP;
            }
        }


        /**
         * Returns a MS time stamp of the current time
         * @return int
         * @inner
         */
        function getTimeStamp() {
            var now = new Date();
            return now.getTime();
        }



        /**
         * Returns a bounds object with left, right, top and bottom properties for the element specified.
         * @param {DomNode} The DOM node to get the bounds for.
         */
        function getbounds( el ) {
            el = $(el);
            var offset = el.offset();

            var bounds = {
                left:offset.left,
                right:offset.left+el.outerWidth(),
                top:offset.top,
                bottom:offset.top+el.outerHeight()
            }

            return bounds;
        }


        /**
         * Checks if the point object is in the bounds object.
         * @param {object} point A point object.
         * @param {int} point.x The x value of the point.
         * @param {int} point.y The x value of the point.
         * @param {object} bounds The bounds object to test
         * @param {int} bounds.left The leftmost value
         * @param {int} bounds.right The righttmost value
         * @param {int} bounds.top The topmost value
         * @param {int} bounds.bottom The bottommost value
         */
        function isInBounds(point, bounds) {
            return (point.x > bounds.left && point.x < bounds.right && point.y > bounds.top && point.y < bounds.bottom);
        };


    }




    /**
     * A catch all handler that is triggered for all swipe directions.
     * @name $.fn.swipe#swipe
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user swiped
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {object} fingerData The coordinates of fingers in event
     */




    /**
     * A handler that is triggered for "left" swipes.
     * @name $.fn.swipe#swipeLeft
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user swiped
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A handler that is triggered for "right" swipes.
     * @name $.fn.swipe#swipeRight
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user swiped
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A handler that is triggered for "up" swipes.
     * @name $.fn.swipe#swipeUp
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user swiped
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A handler that is triggered for "down" swipes.
     * @name $.fn.swipe#swipeDown
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user swiped
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A handler triggered for every phase of the swipe. This handler is constantly fired for the duration of the pinch.
     * This is triggered regardless of swipe thresholds.
     * @name $.fn.swipe#swipeStatus
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {string} phase The phase of the swipe event. See {@link $.fn.swipe.phases}
     * @param {string} direction The direction the user swiped in. This is null if the user has yet to move. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user swiped. This is 0 if the user has yet to move.
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A handler triggered for pinch in events.
     * @name $.fn.swipe#pinchIn
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user pinched in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user pinched
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {int} zoom The zoom/scale level the user pinched too, 0-1.
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A handler triggered for pinch out events.
     * @name $.fn.swipe#pinchOut
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user pinched in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user pinched
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {int} zoom The zoom/scale level the user pinched too, 0-1.
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A handler triggered for all pinch events. This handler is constantly fired for the duration of the pinch. This is triggered regardless of thresholds.
     * @name $.fn.swipe#pinchStatus
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {int} direction The direction the user pinched in. See {@link $.fn.swipe.directions}
     * @param {int} distance The distance the user pinched
     * @param {int} duration The duration of the swipe in milliseconds
     * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
     * @param {int} zoom The zoom/scale level the user pinched too, 0-1.
     * @param {object} fingerData The coordinates of fingers in event
     */

    /**
     * A click handler triggered when a user simply clicks, rather than swipes on an element.
     * This is deprecated since version 1.6.2, any assignment to click will be assigned to the tap handler.
     * You cannot use <code>on</code> to bind to this event as the default jQ <code>click</code> event will be triggered.
     * Use the <code>tap</code> event instead.
     * @name $.fn.swipe#click
     * @event
     * @deprecated since version 1.6.2, please use {@link $.fn.swipe#tap} instead
     * @default null
     * @param {EventObject} event The original event object
     * @param {DomObject} target The element clicked on.
     */

    /**
     * A click / tap handler triggered when a user simply clicks or taps, rather than swipes on an element.
     * @name $.fn.swipe#tap
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {DomObject} target The element clicked on.
     */

    /**
     * A double tap handler triggered when a user double clicks or taps on an element.
     * You can set the time delay for a double tap with the {@link $.fn.swipe.defaults#doubleTapThreshold} property.
     * Note: If you set both <code>doubleTap</code> and <code>tap</code> handlers, the <code>tap</code> event will be delayed by the <code>doubleTapThreshold</code>
     * as the script needs to check if its a double tap.
     * @name $.fn.swipe#doubleTap
     * @see  $.fn.swipe.defaults#doubleTapThreshold
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {DomObject} target The element clicked on.
     */

    /**
     * A long tap handler triggered once a tap has been release if the tap was longer than the longTapThreshold.
     * You can set the time delay for a long tap with the {@link $.fn.swipe.defaults#longTapThreshold} property.
     * @name $.fn.swipe#longTap
     * @see  $.fn.swipe.defaults#longTapThreshold
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {DomObject} target The element clicked on.
     */

    /**
     * A hold tap handler triggered as soon as the longTapThreshold is reached
     * You can set the time delay for a long tap with the {@link $.fn.swipe.defaults#longTapThreshold} property.
     * @name $.fn.swipe#hold
     * @see  $.fn.swipe.defaults#longTapThreshold
     * @event
     * @default null
     * @param {EventObject} event The original event object
     * @param {DomObject} target The element clicked on.
     */

}));
