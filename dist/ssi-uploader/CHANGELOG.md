## ssi-uploader v1.3.0-beta
 * Now supports English(en), Greek(gr), French(fr) and Chinese Simplified(zh_CN).
 * The input name is no more "files[]" but you need to add it in your input element.If no name is set, then the input name will be "files".
 
  ```javascript
//html
<input type="file" id="ssi-uploader" name="myInputName">

//js
$('#ssi-uploader').ssi_uploader();

//and in php
$_FILES ['myInputName'] ['name'];
  ```

## ssi-uploader v1.1.0-beta
 * New option ignoreCallbackErrors (Boolean, default:false): If true the upload will continue normally even if there is an error in a callback function. If false the upload will aborted when it is possible and will console.log the errors.
 * New feature that it shows some details about the upload action (number of pending, number of completed and number of in progress files).
 * Fix a bug in multiple files upload.
 * Change the tooltip logic and some css.
 * New method to throw custom error message in BeforeEachUpload callback by throwing an Error.
 
 ```javascript
$(input).ssi_uploader({
  url:"my/url/upload.php",
  beforeEachUpload:function(fileInfo,xhr){
    if(fileInfo.name=='noImage.jpg'){
        throw new Error('custom message');
    }
  }
})
 ```
