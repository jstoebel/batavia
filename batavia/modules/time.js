
batavia.modules.time = {
    _startTime: new Date().getTime(),
    clock: function() {
        return new batavia.types.Float(new Date().getTime() - batavia.modules.time._startTime);
    },

    time: function() {
        // JS operates in milliseconds, Python in seconds, so divide by 1000
        return new batavia.types.Float(new Date().getTime() / 1000);
    },

    sleep: function(secs) {
        if (secs < 0) {
            throw new batavia.builtins.ValueError('sleep length must be non-negative')
        }

        var start = new Date().getTime();
        while (1) {
            if ((new Date().getTime() - start) / 1000 > secs){
                break;
            }
        }
    }

    struct_time: function(sequence){

    /*
        copied from https://docs.python.org/2/library/time.html#time.struct_time
        DOES THIS NEED ATTRIBUTION?

        0 	tm_year 	(for example, 1993)
        1 	tm_mon 	    range [1, 12]
        2 	tm_mday 	range [1, 31]
        3 	tm_hour 	range [0, 23]
        4 	tm_min 	    range [0, 59]
        5 	tm_sec 	    range [0, 61]; see (2) in strftime() description
        6 	tm_wday 	range [0, 6], Monday is 0
        7 	tm_yday 	range [1, 366]
        8 	tm_isdst 	0, 1 or -1; see below
    */

        if (batavia.isinstance(sequence, [batavia.types.Bytearray, batavia.types.Bytes, batavia.types.Dict,
            batavia.types.FrozenSet, batavia.types.List, batavia.types.Range, batavia.types.Set, batavia.types.Str
            batavia.types.Tuple,
            ])){

            this.tm_year = sequence[0]
            this.tm_mon = sequence[1]
            this.tm_mday = sequence[2]
            this.tm_hour = sequence[3]
            this.tm_min = sequence[4]
            this.tm_sec = sequence[5]
            this.tm_wday = sequence[6]
            this.tm_yday = sequence[7]
            this.tm_isdst = sequence[8]



        } else {
            //some other, unacceptable type
            throw new batavia.builtins.TypeError("constructor requires a sequence")

        }

    },

};
