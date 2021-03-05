/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/

// Basic support functions (BSF)

var BSF = {}

BSF.sleep = function(ms) {
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

BSF.getCleanArray = function(array) {
	var clean = [...array];
	// for (var i = 0; i<array.length; i++)
	// 	if (array[i]!=null)
	// 		clean.push(array[i]);
	return clean;
}

BSF.isNullOrEmpty = function(str) {
	if (str == null)
		return true
	else if (str.replace(" ","") == "")
		return true
	else
		return false
}

BSF.isDir = function(path) {
    try {
        var stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}

module.exports = BSF;