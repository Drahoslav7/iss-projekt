/**
 * Modul pro práci s BMP 8bit greyscale obrázky
 * Vytvořeno pru učely projektu do předmětu ISS
 * Drahoslav Bednář, xbedna55
 * 2014/15
 */

var fs = require('fs');

module.exports = (function (){

	// constructorová fce
	function _Img(image){
		if(typeof image === "string")
			return _Img.load(image);
		if(image instanceof _Img)
			return image.clone();
	}
	
	/* == veřejné metody instance obrázku == */


	/**
	 * Vrátí image vytvořený na základě jiného obrázku
	 * @param  {image} image vzor
	 * @param  {int} defval výchozí hodnota pixelu
	 * @return {image}       nový obrázek
	 */
	_Img.prototype.clone = function(defval){
		var map = []; // 2D pixel map
		for (var m = 0; m < this.height; m++) {
			map[m] = [];
			for (var n = 0; n < this.width; n++) {
				map[m][n] = defval == undefined ? this.map[m][n] : defval;
			};
		};
		var clon = new _Img();
		clon.map = map;
		clon.width = this.width;
		clon.height = this.height;
		clon.headers = this.headers;
		clon.depth = this.depth;
		return clon;
	};

	/**
	 * Vrátí image na který aplikuje filter
	 * @param  {2dArray} filter dvourozměrné pole hodnot
	 * @return {image}        nový obrázek
	 */
	_Img.prototype.filter = function(filter) {
		var zeros = this.clone(0);
		var fh = filter.length;
		var fw = filter[0].length;
		var xoff = Math.floor(fh/2);
		var yoff = Math.floor(fw/2);
		var X, Y;

		for (var x = 0; x<this.height; x++){	
			for (var y = 0; y<this.width; y++){
				for (var x2 = 0; x2<fh; x2++){	
					for (var y2 = 0; y2<fw; y2++){
						X = x+x2-xoff;
						Y = y+y2-yoff;
						if(X<0 || Y<0 || X>=this.height || Y>=this.width)
							continue;
						zeros.map[x][y] += filter[x2][y2] * this.map[X][Y];
					}
				}
				// saturace:
				zeros.map[x][y] = Math.round(zeros.map[x][y]);
				if(zeros.map[x][y] < 0)
					zeros.map[x][y] = 0;
				if(zeros.map[x][y] > 255)
					zeros.map[x][y] = 255;
			}
		}
		return zeros;
	}


	/**
	 * vratí nový image na který aplikuje mediánový filter
	 * @param  {int} dx horizontální průměr oblasti
	 * @param  {int} dy vertikální průměr oblasti
	 * @return {image}    nový obrázek
	 */
	_Img.prototype.medFilter = function(dx,dy) {
		var clone = this.clone(0);
		var xoff = Math.floor(dx/2);
		var yoff = Math.floor(dy/2);
		var X, Y;

		for (var x = 0; x<this.height; x++){	
			for (var y = 0; y<this.width; y++){
				var arr = [];
				for (var x2 = 0; x2<dx; x2++){	
					for (var y2 = 0; y2<dy; y2++){
						X = x+x2-xoff;
						Y = y+y2-yoff;
						if(X<0 || Y<0 || X>=this.height || Y>=this.width)
							arr.push(0);
						else
							arr.push(this.map[X][Y]);
					}
				}
				clone.map[x][y] = median(arr);
			}
		}
		return clone;
	}

	/**
	 * Překlopí obrázek zleva doprava
	 * @return {image} nový obrázek
	 */
	_Img.prototype.flipH = function () {
		var zeros = this.clone(0);
		for (var i = 0; i < this.height; i++) {
			for (var j = 0; j < this.width; j++) {
				zeros.map[i][j] = this.map[i][this.width-j-1];	
			}
		}
		return zeros;
	}

	/**
	 * vratí nový obrázek s roztaženou škálou
	 * @param  {int} mini vstupní dolní hranice
	 * @param  {int} maxi vstupní horní hranice
	 * @param  {int} mino výstupní dolní hranice
	 * @param  {int} maxo výstupní horní hrajice
	 * @return {image}      nový obrázek
	 */
	_Img.prototype.adjust = function (mini, maxi, mino, maxo) {
		var copy = this.clone();
		for (var i = 0; i < this.height; i++)
			for (var j = 0; j < this.width; j++)
				copy.map[i][j] = Math.round(mino + (maxo-mino)*(this.map[i][j]-mini)/(maxi-mini));
		return copy;
	}

	/**
	 * Provede quantizaci obrazu
	 * @param  {int} N počet bitů
	 * @param  {int} a dolní hrnanice
	 * @param  {int} b horní hranice
	 * @return {image}   nový obrázek
	 */
	_Img.prototype.quantization = function (N,a,b) {
		var Npm1 = Math.pow(2,N)-1;
		var img = this.clone(0);

		for (var m = 0; m < this.height; m++)
			for (var n = 0; n < this.width; n++)
				img.map[m][n] = Math.round(Npm1*(this.map[m][n]-a)/(b-a)) * (b-a)/Npm1 + a; 
		return img;
	}

	_Img.prototype.save = function(filename) {
		_Img.save(filename, this);
		return this;
	};


	/* veřejné třídní funkce */

	/**
	 * Vrátí image objekt
	 * @param  {string} filename název souboru
	 * @return {image}          objekt s položkami width, height, depth a map
	 */
	_Img.load = function (filename) {	
		var img = fs.readFileSync(filename);

		if(img[0] !== 'B'.charCodeAt() || img[1] !== 'M'.charCodeAt()){
			console.error("not BMP format");
			return null;
		}


		dataOffset = getValLE(img, 10, 4);

		var width; // šířka
		var height; //výška
		var depth; // počet bitů na pixel

		DIBheaderSize = getValLE(img, 14, 4);

		switch (DIBheaderSize) {
			case 12:
				width = getValLE(img, 18, 2);
				height = getValLE(img, 20, 2);
				depth = getValLE(img, 24, 2);
				break;
			case 40:
				width = getValLE(img, 18, 4);
				height = getValLE(img, 22, 4);
				depth = getValLE(img, 28, 2);
				break;
			default:
				console.error("unknown DIB header format");
				return null;
		}

		if(depth !== 8){
			console.error("depth is %d, but I only can work with 8", depth);
			return null;
		}

		var map = []; // 2D pixel map
		for (var m = 0; m < height; m++) {
			map[m] = [];
			for (var n = 0; n < width; n++) {
				map[m][n] = getValLE(img, dataOffset + m*width + n, depth/8);
			};
		};

		var headers = [];
		while(dataOffset--){
			headers[dataOffset] = img[dataOffset];
		}

		var image = new _Img(); 
		image.height = height;
		image.width = width;
		image.depth = depth;
		image.map = map;
		image.headers = headers;

		return image;
	}

	/**
	 * Zapíše image do souboru
	 * @param {string} filename název souboru
	 * @param {imgae} image    obrázek k zapsání
	 */
	_Img.save = function (filename,image) {
		fs.writeFileSync(filename, new Buffer(image.headers), {flag:"w", encoding:'binary'});
		for (var i = 0; i<image.height; i++) {
			fs.writeFileSync(filename, new Buffer(image.map[i]), {flag:"a", encoding:'binary'});
		}
	}



	/* pomocné funkce */

	/**
	 * Vrací little endian hodnotu
	 * @param  {byte array} data
	 * @param  {int} start offset kde začíná hodnota
	 * @param  {int} bytes počet bytů které tvoří hodnotu
	 * @return {int}       hodnota
	 */
	function getValLE(data,start,bytes){
		var val = 0;
		while(bytes){
			val *= 256;
			val += +data[start+ --bytes];
		}
		return val;
	}

	/** vrátí median (průměrnou střední hodnotu) */
	function median(arr){
		arr.sort(function(a, b){return a-b});
		var half = Math.floor((arr.length)/2);
		if(!(half % 2))
			return arr[half];
		else
			return Math.round((arr[half-1] + arr[half])/2);
	}

	return _Img;

})();