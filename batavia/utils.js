
function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

batavia.isArray = Array.isArray;
if (!batavia.isArray) {
    batavia.isArray = function (obj) {
        return  Object.prototype.toString.call(obj) === '[object Array]';
    };
}

/*************************************************************************
 * Type comparison defintions that match Python-like behavior.
 *************************************************************************/

batavia.isinstance = function(obj, type) {
    if (type instanceof Array) {
        for (var t in type) {
            if (batavia.isinstance(obj, type[t])) {
                return true;
            }
        }
        return false;
    } else {
        switch (typeof obj) {
            case 'boolean':
                return type === batavia.types.Bool;
            case 'number':
                return type === batavia.types.Int;
            case 'string':
                return type === batavia.types.Str;
            case 'object':
                if (type === null || type === batavia.types.NoneType) {
                    return obj === null;
                } else {
                    return obj instanceof type;
                }
                break;
            default:
                return false;
        }
    }
};

batavia.type_name = function(arg) {
    var type_name;

    switch (typeof arg) {
        case 'boolean':
            type_name = 'bool';
            break;
        case 'number':
            type_name = 'Native number';
            break;
        case 'string':
            type_name = 'str';
            break;
        case 'object':
            if (arg === null || arg === batavia.types.NoneType) {
                type_name = 'NoneType';
            } else if (arg.__class__.__name__) {
                type_name = arg.__class__.__name__;
            } else {
                type_name = 'Native object';
            }
    }

    return type_name;
};

batavia.issubclass = function(cls, type) {
    var t;
    if (type instanceof Array) {
        for (t in type) {
            if (batavia.issubclass(cls, type[t])) {
                return true;
            }
        }
        return false;
    } else {
        switch (typeof cls) {
            case 'boolean':
                return type === batavia.types.Bool;
            case 'number':
                return type === batavia.types.Int;
            case 'string':
                return type === batavia.types.Str;
            case 'object':
                if (type === null || type === batavia.types.NoneType) {
                    return cls === null;
                } else {
                    var mro = cls.mro();
                    for (t in mro) {
                        if (mro[t] === type.prototype.__class__) {
                            return true;
                        }
                    }
                }
                return false;
            default:
                return false;
        }
    }
};

/*************************************************************************
 * sprintf() implementation from Brython
 TODO Where does proper attribution go? What does it look like?
 *************************************************************************/
var format_padding = function(s, flags, minus_one) {
    var padding = flags.padding
    if (!padding) {  // undefined
        return s
    }
    s = s.toString()
    padding = parseInt(padding, 10)
    if (minus_one) {  // numeric formatting where sign goes in front of padding
        padding -= 1
    }
    if (!flags.left) {
        return get_char_array(padding - s.length, flags.pad_char) + s
    } else {
        // left adjusted
        return s + get_char_array(padding - s.length, flags.pad_char)
    }
}

var str_format = function(val, flags) {
    // string format supports left and right padding
    flags.pad_char = " "  // even if 0 padding is defined, don't use it
    return format_padding(String(val), flags)  //changed from format_padding(str(val), flags)
}

var num_format = function(val, flags) {
    number_check(val)
    if (val.__class__ === $B.LongInt.$dict) {
      val = $B.LongInt.$dict.to_base(val, 10)
    } else {
      val = parseInt(val)
    }

    var s = format_int_precision(val, flags)
    if (flags.pad_char === '0') {
        if (val < 0) {
            s = s.substring(1)
            return '-' + format_padding(s, flags, true)
        }
        var sign = format_sign(val, flags)
        if (sign !== '') {
            return sign + format_padding(s, flags, true)
        }
    }

    return format_padding(format_sign(val, flags) + s, flags)
}

var repr_format = function(val, flags) {
    flags.pad_char = " "  // even if 0 padding is defined, don't use it
    return format_padding(repr(val), flags)
}

var octal_format = function(val, flags) {
    number_check(val)
    var ret

    if (val.__class__ === $B.LongInt.$dict) {
      ret = $B.LongInt.$dict.to_base(8)
    } else {
      ret = parseInt(val)
      ret = ret.toString(8)
    }

    ret = format_int_precision(ret, flags)

    if (flags.pad_char === '0') {
        if (val < 0) {
            ret = ret.substring(1)
            ret = '-' + format_padding(ret, flags, true)
        }
        var sign = format_sign(val, flags)
        if (sign !== '') {
            ret = sign + format_padding(ret, flags, true)
        }
    }

    if (flags.alternate) {
        if (ret.charAt(0) === '-') {
            ret = "-0o" + ret.slice(1)
        } else {
            ret = "0o" + ret
        }
    }
    return format_padding(ret, flags)
}

var ascii_format = function(val, flags) {
    flags.pad_char = " "  // even if 0 padding is defined, don't use it
    return format_padding(ascii(val), flags)
}

var single_char_format = function(val, flags) {
    if(isinstance(val,str) && val.length==1) return val
    try {
        val = _b_.int(val)  // yes, floats are valid (they are cast to int)
    } catch (err) {
        throw _b_.TypeError('%c requires int or char')
    }
    return format_padding(chr(val), flags)
}

var floating_point_format = function(val, upper, flags) {
    val = _float_helper(val, flags)
    var v = val.toString()
    var v_len = v.length
    var dot_idx = v.indexOf('.')
    if (dot_idx < 0) {
        dot_idx = v_len
    }
    if (val < 1 && val > -1) {
        var zeros = leading_zeros.exec(v)
        var numzeros
        if (zeros) {
            numzeros = zeros[1].length
        } else {
            numzeros = 0
        }
        if (numzeros >= 4) {
            val = format_sign(val, flags) + format_float_precision(val, upper, flags, _floating_g_exp_helper)
            if (!flags.alternate) {
                var trl = trailing_zeros.exec(val)
                if (trl) {
                    val = trl[1].replace(trailing_dot, '') + trl[3]  // remove trailing
                }
            } else {
                if (flags.precision <= 1) {
                    val = val[0] + '.' + val.substring(1)
                }
            }
            return format_padding(val, flags)
        }
        flags.precision += numzeros
        return format_padding(format_sign(val, flags) + format_float_precision(val, upper, flags,
            function(val, precision) {
                val = val.toFixed(min(precision, v_len - dot_idx) + numzeros)
            }), flags)
    }

    if (dot_idx > flags.precision) {
        val = format_sign(val, flags) + format_float_precision(val, upper, flags, _floating_g_exp_helper)
        if (!flags.alternate) {
            var trl = trailing_zeros.exec(val)
            if (trl) {
                val = trl[1].replace(trailing_dot, '') + trl[3]  // remove trailing
            }
        } else {
            if (flags.precision <= 1) {
                val = val[0] + '.' + val.substring(1)
            }
        }
        return format_padding(val, flags)
    }
    return format_padding(format_sign(val, flags) + format_float_precision(val, upper, flags,
        function(val, precision) {
            if (!flags.decimal_point) {
                precision = min(v_len - 1, 6)
            } else if (precision > v_len) {
                if (!flags.alternate) {
                    precision = v_len
                }
            }
            if (precision < dot_idx) {
                precision = dot_idx
            }
            return val.toFixed(precision - dot_idx)
        }), flags)
}

// fF
var floating_point_decimal_format = function(val, upper, flags) {
    val = _float_helper(val, flags)
    return format_padding(format_sign(val, flags) + format_float_precision(val, upper, flags,
        function(val, precision, flags) {
            val = val.toFixed(precision)
            if (precision === 0 && flags.alternate) {
                val += '.'
            }
            return val
        }), flags)
}

// eE
var floating_point_exponential_format = function(val, upper, flags) {
    val = _float_helper(val, flags)

    return format_padding(format_sign(val, flags) + format_float_precision(val, upper, flags, _floating_exp_helper), flags)
}

var signed_hex_format = function(val, upper, flags) {
    var ret
    number_check(val)

    if (val.__class__ === $B.LongInt.$dict) {
       ret=$B.LongInt.$dict.to_base(val, 16)
    } else {
       ret = parseInt(val)
       ret = ret.toString(16)
    }
    ret = format_int_precision(ret, flags)
    if (upper) {
        ret = ret.toUpperCase()
    }
    if (flags.pad_char === '0') {
        if (val < 0) {
            ret = ret.substring(1)
            ret = '-' + format_padding(ret, flags, true)
        }
        var sign = format_sign(val, flags)
        if (sign !== '') {
            ret = sign + format_padding(ret, flags, true)
        }
    }

    if (flags.alternate) {
        if (ret.charAt(0) === '-') {
            if (upper) {
                ret = "-0X" + ret.slice(1)
            } else {
                ret = "-0x" + ret.slice(1)
            }
        } else {
            if (upper) {
                ret = "0X" + ret
            } else {
                ret = "0x" + ret
            }
        }
    }
    return format_padding(format_sign(val, flags) + ret, flags)
}

var num_flag = function(c, flags) {
    if (c === '0' && !flags.padding && !flags.decimal_point && !flags.left) {
        flags.pad_char = '0'
        return
    }
    if (!flags.decimal_point) {
        flags.padding = (flags.padding || "") + c
    } else {
        flags.precision = (flags.precision || "") + c
    }
}

var decimal_point_flag = function(val, flags) {
    if (flags.decimal_point) {
        // can only have one decimal point
        throw new UnsupportedChar()
    }
    flags.decimal_point = true
}

var neg_flag = function(val, flags) {
    flags.pad_char = ' '  // overrides '0' flag
    flags.left = true
}

var space_flag = function(val, flags) {
    flags.space = true
}

var sign_flag = function(val, flags) {
    flags.sign = true
}

var alternate_flag = function(val, flags) {
    flags.alternate = true
}


 var char_mapping = {
    's': str_format,
    'd': num_format,
    'i': num_format,
    'u': num_format,
    'o': octal_format,
    'r': repr_format,
    'a': ascii_format,
    'g': function(val, flags) {return floating_point_format(val, false, flags)},
    'G': function(val, flags) {return floating_point_format(val, true, flags)},
    'f': function(val, flags) {return floating_point_decimal_format(val, false, flags)},
    'F': function(val, flags) {return floating_point_decimal_format(val, true, flags)},
    'e': function(val, flags) {return floating_point_exponential_format(val, false, flags)},
    'E': function(val, flags) {return floating_point_exponential_format(val, true, flags)},
    'x': function(val, flags) {return signed_hex_format(val, false, flags)},
    'X': function(val, flags) {return signed_hex_format(val, true, flags)},
    'c': single_char_format,
    '0': function(val, flags) {return num_flag('0', flags)},
    '1': function(val, flags) {return num_flag('1', flags)},
    '2': function(val, flags) {return num_flag('2', flags)},
    '3': function(val, flags) {return num_flag('3', flags)},
    '4': function(val, flags) {return num_flag('4', flags)},
    '5': function(val, flags) {return num_flag('5', flags)},
    '6': function(val, flags) {return num_flag('6', flags)},
    '7': function(val, flags) {return num_flag('7', flags)},
    '8': function(val, flags) {return num_flag('8', flags)},
    '9': function(val, flags) {return num_flag('9', flags)},
    '-': neg_flag,
    ' ': space_flag,
    '+': sign_flag,
    '.': decimal_point_flag,
    '#': alternate_flag
}


batavia._substitute = function(self, args) {

    // ensure that number of args and markers matches
    var re = /\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijosuxX])/g;


    var matches = self.match(re)
    var matchCount = (matches === null ? 0 : matches.length )

    // errors for unequal number of place holders and arguments

    if(matchCount > args.length){
        // too many

        throw new batavia.builtins.TypeError("not enough arguments for format string");

    } else if(matchCount < args.length) {
        // not enough
        throw new batavia.builtins.TypeError("not all arguments converted during string formatting");
    }

    var length = self.length,
        pos = 0 |0,
        argpos = null,
        getitem
    if (batavia.isinstance(args[0], [batavia.types.Tuple])) {
        argpos = 0 |0
//    if (batavia.isinstance(args, _b_.tuple)) {
//        argpos = 0 |0
    }else{
        getitem = args[0]
//        getitem = batavia.builtins.getattr(args, '__getitem__', null)
//        getitem = _b_.getattr(args,'__getitem__', null)
    }
    var ret = ''
    var $get_kwarg_string = function(s) {
        // returns [self, newpos]
        ++pos
        var rslt = kwarg_key.exec(s.substring(newpos))
        if (!rslt) {
            throw batavia.builtins.ValueError("incomplete format key")
        }
        var key = rslt[1]
        newpos += rslt[0].length
        try {
            var self = getitem(key)
        } catch(err) {
            if (err.name === "KeyError") {
                throw err
            }
            throw batavia.builtins.TypeError("format requires a mapping")
        }
        return get_string_value(s, self)
    }

    var $get_arg_string = function(s) {
        // returns [self, newpos]
        var self

        // non-tuple args
        if (argpos === null) {
            // args is the value
            self = args
        } else {
            self = args[argpos++]
            if(self===undefined){
                throw batavia.builtins.TypeError("not enough arguments for format string")
            }
        }
        return get_string_value(s, self)
    }
    var get_string_value = function(s, self) {
        // todo: get flags, type
        // todo: string value based on flags, type, value
        var flags = {'pad_char': ' '}
        do {
            var func = char_mapping[s[newpos]]
            try {
                if (func === undefined) {
                    throw new UnsupportedChar()
                } else {
                    var ret = func(self, flags)
                    if (ret !== undefined) {
                        return ret
                    }
                    ++newpos
                }
            } catch (err) {
                if (err.name === "UnsupportedChar") {
                    invalid_char = s[newpos]
                    if (invalid_char === undefined) {
                        throw batavia.builtins.ValueError("incomplete format")
                    }
                    throw batavia.builtins.ValueError("unsupported format character '" + invalid_char +
                        "' (0x" + invalid_char.charCodeAt(0).toString(16) + ") at index " + newpos)
                } else if (err.name === "NotANumber") {
                    var try_char = s[newpos]
                    var cls = self.__class__
                    if (!cls) {
                        if (typeof(self) === 'string') {
                            cls = 'str'
                        } else {
                            cls = typeof(self)
                        }
                    } else {
                        cls = cls.__name__
                    }
                    throw batavia.builtins.TypeError("%" + try_char + " format: a number is required, not " + cls)
                } else {
                    throw err
                }
            }
        } while (true)
    }
    var nbph = 0 // number of placeholders
    do {
        var newpos = self.indexOf('%', pos)
        if (newpos < 0) {
            ret += self.substring(pos)
            break
        }
        ret += self.substring(pos, newpos)
        ++newpos
        if (newpos < length) {
            if (self[newpos] === '%') {
                ret += '%'
            } else {
                nbph++
                if (self[newpos] === '(') {
                    ++newpos
                    ret += $get_kwarg_string(self)
                } else {
                    ret += $get_arg_string(self)
                }
            }
        } else {
            // % at end of string
            throw batavia.builtins.ValueError("incomplete format")
        }
        pos = newpos + 1
    } while (pos < length)

    if(argpos!==null){
        if(args.length>argpos){
            throw batavia.builtins.TypeError('not enough arguments for format string')
        }else if(args.length<argpos){
            throw batavia.builtins.TypeError('not all arguments converted during string formatting')
        }
    }else if(nbph==0){
        throw _b_.TypeError('not all arguments converted during string formatting')
    }
    return ret
}

//function str(arg){
//    if(arg===undefined) return ''
//    switch(typeof arg) {
//      case 'string':
//          return arg
//      case 'number':
//          if(isFinite(arg)){return arg.toString()}
//    }
//
//    try{
//        if(arg.__class__===$B.$factory){
//            // arg is a class (the factory function)
//            // In this case, str() doesn't use the attribute __str__ of the
//            // class or its subclasses, but the attribute __str__ of the
//            // class metaclass (usually "type") or its subclasses (usually
//            // "object")
//            // The metaclass is the attribute __class__ of the class dictionary
//            var func = $B.$type.__getattribute__(arg.$dict.__class__,'__str__')
//            if(func.__func__===_b_.object.$dict.__str__){return func(arg)}
//            return func()
//        }
//
//        var f = getattr(arg,'__str__')
//        // XXX fix : if not better than object.__str__, try __repr__
//        return f()
//    }
//    catch(err){
//        //console.log('err '+err)
//        try{ // try __repr__
//             var f = getattr(arg,'__repr__')
//             return getattr(f,'__call__')()
//        }catch(err){
//             if($B.debug>1){console.log(err)}
//             console.log('Warning - no method __str__ or __repr__, default to toString', arg)
//             return arg.toString()
//        }
//    }
//}
//str.__class__ = $B.$factory
//str.$dict = $StringDict

//batavia._substitute = function(format, args) {
//
//    var results = [];
//    var special_case_types = [
//        batavia.types.List,
//        batavia.types.Dict,
//        batavia.types.Bytes];
//
//    /* This is the general form regex for a sprintf-like string. */
//    var re = /\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijosuxX])/g;
//    var match;
//    var lastIndex = 0;
//
//    // check if num format markers != num args
//    var markers = format.match(re);
//    if(markers !== null){
//        if(markers.length < args.length){
//            throw new batavia.builtins.TypeError('not all arguments converted during string formatting');
//        } else if(markers.length > args.length) {
//            throw new batavia.builtins.TypeError("not enough arguments for format string");
//        }
//
//    }
//
//    for (var i = 0; i < args.length; i++) {
//        var arg = args[i];
//
//        match = re.exec(format);
//        if (match) {
//            switch (match[8]) {
//                case "b":
//                    arg = arg.toString(2);
//                break;
//                case "c":
//                    arg = String.fromCharCode(arg);
//                break;
//                case "d":
//                case "i":
//                    arg = parseInt(arg, 10);
//                break;
//                case "j":
//                    arg = JSON.stringify(arg, null, match[6] ? parseInt(match[6], 10) : 0);
//                break;
//                case "e":
//                    arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential();
//                break;
//                case "f":
//                    arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg);
//                break;
//                case "g":
//                    arg = match[7] ? parseFloat(arg).toPrecision(match[7]) : parseFloat(arg);
//                break;
//                case "o":
//                    arg = arg.toString(8);
//                break;
//                case "s":
//                    arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg);
//                break;
//                case "u":
//                    arg = arg >>> 0;
//                break;
//                case "x":
//                    arg = arg.toString(16);
//                break;
//                case "X":
//                    arg = arg.toString(16).toUpperCase();
//                break;
//            }
//
//            results.push(format.slice(lastIndex, match.index));
//            lastIndex = re.lastIndex;
//            results.push(arg);
//        } else if (    (args.constructor === Array)
//                    && batavia.isinstance(args[0], special_case_types)) {
//            return format;
//        } else {
//            throw new batavia.builtins.TypeError('not all arguments converted during string formatting');
//        }
//    }
//    // Push the rest of the string.
//    results.push(format.slice(re.lastIndex));
//    return results.join('');
//};

/*************************************************************************
 * Class construction
 *************************************************************************/

batavia.make_class = function(args, kwargs) {
    var func = args[0];
    var name = args[1];
    var bases = kwargs.bases || args[2];
    var metaclass = kwargs.metaclass || args[3];
    var kwds = kwargs.kwds || args[4] || [];

    // Create a locals context, and run the class function in it.
    var locals = new batavia.types.Dict();
    var retval = func.__call__.apply(this, [[], [], locals]);

    // Now construct the class, based on the constructed local context.
    var klass = function(vm, args, kwargs) {
        if (this.__init__) {
            this.__init__.__self__ = this;
            this.__init__.__call__.apply(vm, [args, kwargs]);
        }
    };

    for (var attr in locals) {
        if (locals.hasOwnProperty(attr)) {
            klass.prototype[attr] = locals[attr];
        }
    }
    klass.prototype.__class__ = new batavia.types.Type(name, bases);

    var PyObject = function(vm, klass, name) {
        var __new__ = function(args, kwargs) {
            return new klass(vm, args, kwargs);
        };
        __new__.__python__ = true;
        return __new__;
    }(this, klass, name);

    return PyObject;
};

/*************************************************************************
 * callable construction
 *************************************************************************/

batavia.make_callable = function(func) {
    var fn = function(args, kwargs, locals) {
        var retval;
        var callargs = batavia.modules.inspect.getcallargs(func, args, kwargs);

        var frame = this.make_frame({
            'code': func.__code__,
            'callargs': callargs,
            'f_globals': func.__globals__,
            'f_locals': locals || new batavia.types.Dict()
        });

        if (func.__code__.co_flags & batavia.modules.dis.CO_GENERATOR) {
            gen = new batavia.core.Generator(frame, this);
            frame.generator = gen;
            retval = gen;
        } else {
            retval = this.run_frame(frame);
        }
        return retval;
    };
    fn.__python__ = true;
    return fn;
};

batavia.run_callable = function(self, func, posargs, namedargs) {
    // Here you are in JS-land, and you want to call a method on an object
    // but what kind of callable is it?  You may not know if you were passed
    // the function as an argument.

    // TODO: consider separating these out, which might make things more
    //   efficient, but this at least consolidates the use-cases.

    // This gets the right js-callable thing, and runs it in the VirtualMachine.

    // There are a couple of scenarios:
    // 1. You *are* the virtual machine, and you want to call it:
    //    See batavia.VirtualMachine.prototype.call_function
    //    run_callable(<virtualmachine.is_vm=true>, <python method>, ...)
    //    i.e. run_callable(this, func, posargs, namedargs_dict)
    // 2. You are in a JS-implemented type, and the method or object is
    //    e.g. batavia/types/Map.js,Filter.js
    //    run_callable(<python_parent_obj>, <python_method (with func._vm)>, ...)
    //    If you are just passed an anonymous method:
    //    run_callable(<falsish>, <python_method (with func._vm)>, ...)
    // 3. You are in a builtin called by javascript and you also don't
    //    know the provenance of the object/function
    //    e.g. iter() called internally by types/Map.js
    //    see #2 scenario

    //the VM should pass itself in self, but if it already blessed
    //  a method with itself on ._vm just use that.
    var vm = (func._vm) ? func._vm : self;

    if (self && !self.is_vm && func.__python__ && !func.__self__) {
        // In scenarios 2,3 the VM would normally be doing this
        // at the moment of getting the function through LOAD_ATTR
        // but if we call it by JS, then it still needs to be
        // decorated with itself
        func = new batavia.types.Method(self, func);
        // Note, we change func above, so it can get __self__
        // and be affected by the code-path below
    }

    if ('__python__' in func && '__self__' in func) {
        // A python-style method
        // Methods calls get self as an implicit first parameter.
        if (func.__self__) {
            posargs.unshift(func.__self__);
        }

        // The first parameter must be the correct type.
        if (posargs[0] instanceof func.constructor) {
            throw 'unbound method ' + func.__func__.__name__ + '()' +
                ' must be called with ' + func.__class__.__name__ + ' instance ' +
                'as first argument (got ' + posargs[0].prototype + ' instance instead)';
        }
        func = func.__func__.__call__;
    } else if ('__call__' in func) {
        // A Python callable
        func = func.__call__;
    } else if (func.prototype) {
        // If this is a native Javascript class constructor, wrap it
        // in a method that uses the Python calling convention, but
        // instantiates the object.
        if (!func.__python__ && Object.keys(func.prototype).length > 0) {
            func = function(fn) {
                return function(args, kwargs) {
                    var obj = Object.create(fn.prototype);
                    fn.apply(obj, args);
                    return obj;
                };
            }(func);
        }
    }

    var retval = func.apply(vm, [posargs, namedargs]);
    return retval;
};

/************************
 * Working with iterables
 ************************/

// Iterate a python iterable to completion,
// calling a javascript callback on each item that it yields.
batavia.iter_for_each = function(iterobj, callback) {
    try {
        while (true) {
            var next = batavia.run_callable(iterobj, iterobj.__next__, [], null);
            callback(next);
        }
    } catch (err) {
        if (!(err instanceof batavia.builtins.StopIteration)) {
            throw err;
        }
    }
};
