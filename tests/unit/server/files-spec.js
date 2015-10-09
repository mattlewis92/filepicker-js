describe("The files module", function(){
    it("defaults to base64 when reading from fpurls", function(){
        var url = "/library/file/read/base64";
        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.readFromFPUrl(url, {}, success, error, progress);
        });

        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);

        runs(function(){
            expect(success).toHaveBeenCalledWith("Hello WorldÃÂ¥Â¹");
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can also read non-base64 from fpurls", function(){
        var url = "/library/file/read/nonbase64";
        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.readFromFPUrl(url, {base64encode:false}, success, error, progress);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith("Hello World");
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("gracefully handles a variety of errors when reading from urls", function(){
        //url: error code
        var error_map = {
            "/library/file/read/error/notfound": 115,
            "/library/file/read/error/badparam": 400,
            "/library/file/read/error/notauth": 403,
            "/library/file/read/error/server": 118
        };

        error_map[test_server.cors+"/library/file/read/error/corserror"] = 118;

        var expect_error = function(url, code){
            var success,error,progress;
            runs(function(){
                success = jasmine.createSpy("success");
                error = jasmine.createSpy("error");
                progress = jasmine.createSpy("progress");
                filepicker.files.readFromUrl(url, {base64encode:false}, success, error, progress);
            });
            waitsFor(function(){
                return success.wasCalled || error.wasCalled;
            }, "the callback to occur", 10000);
            runs(function(){

                expect(success).not.toHaveBeenCalled();
                expect(error).toHaveBeenCalled();
                

                var fperror = error.calls.allArgs()[0][0];
                expect(fperror.code).toEqual(code);
                expect(progress).toHaveBeenCalledWith(100);
            });
        };
        for (url in error_map){
            console.log('url', url);
            expect_error(url, error_map[url]);
        }
    });

    var makeFile = function(content, mimetype, name) {
        content = content || "helloWorld";
        mimetype = mimetype || "text/plain";
        name = name || "tester.txt";

        try {
            return new Blob([content], {type: mimetype, name: name});
        } catch (e) {
            if (window.WebKitBlobBuilder) {
                var builder = new WebKitBlobBuilder();
                builder.append(content);
                var file = builder.getBlob(mimetype);
                file.name = name;
                return file;
            } else {
                if (window.test.console && window.test.console.error) {
                    window.test.console.error("can't test uploading files");
                }
                return undefined;
            }
        }
    };

    it("can read from files", function(){
        var file = makeFile();
        if (file === undefined) { return; }

        var success,error,progress;

        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.readFromFile(file, {asText:true}, success, error, progress);
        });

        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        
        runs(function(){
            expect(success).toHaveBeenCalledWith("helloWorld");
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can read from files as base64", function(){
        var data = "Hello WorldÍ¥¹";
        var file = makeFile(data);
        if (file === undefined) { return; }

        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.readFromFile(file, {base64encode:true, asText: false}, success, error, progress);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith("SGVsbG8gV29ybGTDg8KNw4LCpcOCwrk=");
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can read from files even without FileReader by going to the server", function(){
        if (!window.test.features.fileupload) {
            window.test.console.warn("***Skipping test because can't upload files***");
            return;
        }
        
        //Note - there may be an issue if data is binary with not being base64encoded before sent to server
        //var data = "Hello WorldÍ¥¹";
        var data = "Hello World234";
        var file = makeFile(data);
        if (file === undefined) { return; }

        var success,error,progress;

        runs(function(){
            //mock out FileReader
            spyOn(window, "FileReader");
            window.FileReader = null;

            //mock out store url constructor
            spyOn(filepicker.urls, "constructStoreUrl").andReturn(
                "/library/file/readstore/store/success");

            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");

            filepicker.files.readFromFile(file, {base64encode:true, asText: false}, success, error, progress);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith("SGVsbG8gV29ybGTDg8KNw4LCpcOCwrk=");
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(10);
            expect(progress).toHaveBeenCalledWith(50);
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("gracefully handles filereader errors", function(){
        var data = "Hello World234";
        var file = makeFile(data);
        if (file === undefined) { return; }

        var success,error,progress;

        //mock out FileReader with own object
        var freader = jasmine.createSpyObj('file reader',
            ['readAsText','readAsBinaryString']);
        spyOn(window, "FileReader").andReturn(freader);

        success = jasmine.createSpy("success");
        error = jasmine.createSpy("error");
        progress = jasmine.createSpy("progress");

        filepicker.files.readFromFile(file, {}, success, error, progress);
        expect(freader.readAsBinaryString).toHaveBeenCalledWith(file);
        
        //firing off events
        var evt = {target:{error:{code: 0}}};
        var fperror;
        
        evt.target.error.code = evt.target.error.NOT_FOUND_ERR = DOMException.NOT_FOUND_ERR;
        freader.onerror(evt);
        expect(error).toHaveBeenCalled();
        fperror = error.calls[0].args[0];
        expect(fperror.code).toEqual(115);
        error.reset();

        evt.target.error.code = evt.target.error.NOT_READABLE_ERR = DOMException.NOT_READABLE_ERR;
        freader.onerror(evt);
        expect(error).toHaveBeenCalled();
        fperror = error.calls[0].args[0];
        expect(fperror.code).toEqual(116);
        error.reset();

        evt.target.error.code = evt.target.error.ABORT_ERR = DOMException.ABORT_ERR;
        freader.onerror(evt);
        expect(error).toHaveBeenCalled();
        fperror = error.calls[0].args[0];
        expect(fperror.code).toEqual(117);
        error.reset();

        evt.target.error.code = -1;
        freader.onerror(evt);
        expect(error).toHaveBeenCalled();
        fperror = error.calls[0].args[0];
        expect(fperror.code).toEqual(118);
        error.reset();

        expect(success).not.toHaveBeenCalled();
    });

    it("can write data to an fpurl", function(){
        var url = "/library/file/write/text";
        var data = "cool beans";
        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.writeDataToFPUrl(url, data, {}, success, error, progress);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                url: "https://www.filepicker.io/api/file/abc",
                filename: "test.txt",
                mimetype: "text/plain",
                size: 10,
                isWriteable: true
            });
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can write a file input to an fpurl", function(){
        if (!window.test.features.fileupload) {
            window.test.console.warn("***Skipping test because can't upload files***");
            return;
        }
        var url = "/library/file/write/file";
        var data = "Hello World456";
        var file = makeFile(data);
        if (file === undefined) { return; }

        var input = {files: [file]};

        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.writeFileInputToFPUrl(url, input, {}, success, error, progress);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                url: "https://www.filepicker.io/api/file/nomnom",
                filename: "test.txt",
                mimetype: "text/plain",
                size: 14,
                isWriteable: true
            });
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can write a DOM file to an fpurl", function(){
        if (!window.test.features.fileupload) {
            window.test.console.warn("***Skipping test because can't upload files***");
            return;
        }
        var url = "/library/file/write/domfile";
        var data = "Hello World789";
        var file = makeFile(data);
        if (file === undefined) { return; }

        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.writeFileToFPUrl(url, file, {}, success, error, progress);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                url: "https://www.filepicker.io/api/file/nomnom2",
                filename: "test.txt",
                mimetype: "text/plain",
                size: 14,
                isWriteable: true
            });
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can write URL to an fpurl", function(){
        var url = "/library/file/write/url";
        var input_url = "http://www.google.com";

        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.writeUrlToFPUrl(url, input_url, {mimetype:"text/html"}, success, error, progress);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                url: "https://www.filepicker.io/api/file/nomnom3",
                filename: "google.html",
                mimetype: "text/html",
                size: 4556,
                isWriteable: true
            });
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can store a file input", function(){
        //we have to spy on the iframe since we can't create files
        spyOn(filepicker.iframeAjax, "post");
        spyOn(filepicker.urls, "constructStoreUrl").andReturn("store_url");
        var input = {
            value: "C:\\fakepath\\myfile.txt",
            name: "something else"
        };

        var success,error,progress;
        success = jasmine.createSpy("success");
        error = jasmine.createSpy("error");
        progress = jasmine.createSpy("progress");

        filepicker.files.storeFileInput(input, {}, success, error, progress);
        expect(filepicker.urls.constructStoreUrl).toHaveBeenCalledWith({
            storage: "S3",
            filename: "myfile.txt"
        });
        expect(input.name).toEqual("fileUpload");
        expect(filepicker.iframeAjax.post).toHaveBeenCalledWith("store_url", {
            data: input,
            processData: false,
            json: true,
            success: jasmine.any(Function),
            error: jasmine.any(Function)
        });
        var onSuccess = filepicker.iframeAjax.post.calls[0].args[1].success;
        var resp = {
            url: "https://www.filepicker.io/api/file/nomnom3",
            filename: "google.html",
            mimetype: "text/html",
            size: 4556,
            isWriteable: true
        };
        onSuccess(resp);
        expect(input.name).toEqual("something else");
        expect(success).toHaveBeenCalledWith(resp);
    });

    it("can store a DOM file", function(){
        if (!window.test.features.fileupload) {
            window.test.console.warn("***Skipping test because can't upload files***");
            return;
        }

        var store_url = "/library/file/store/domfile";
        spyOn(filepicker.urls, "constructStoreUrl").andReturn(store_url);
        var data = "BlahBlah";
        var file = makeFile(data);
        if (file === undefined) { return; }
        file.name = "tester.txt";

        var success,error,progress;
        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.storeFile(file, {}, success, error, progress);
            expect(filepicker.urls.constructStoreUrl).toHaveBeenCalledWith({
                filename: 'tester.txt',
                storage: 'S3'
            });
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                url: "https://www.filepicker.io/api/file/yeah1",
                filename: "test.txt",
                mimetype: "text/plain",
                size: 8,
                isWriteable: true
            });
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can store raw data", function(){
        var store_url = "/library/file/store/image";
        spyOn(filepicker.urls, "constructStoreUrl").andReturn(store_url);

        var data = "cooler beans";
        var success,error,progress;

        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.storeData(data, {mimetype:'image/png'}, success, error, progress);
            expect(filepicker.urls.constructStoreUrl).toHaveBeenCalledWith({
                storage: 'S3',
                mimetype: 'image/png'
            });
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                url: "https://www.filepicker.io/api/file/yeah2",
                filename: "test.png",
                mimetype: "image/png",
                size: 12,
                isWriteable: false
            });
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can store a URL", function(){
        var store_url = "/library/file/store/url";
        spyOn(filepicker.urls, "constructStoreUrl").andReturn(store_url);

        var url = "http://www.imgix.com/p12";
        var success,error,progress;

        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            progress = jasmine.createSpy("progress");
            filepicker.files.storeUrl(url, {storage: 'AZURE', filename:'imgix.html'}, success, error, progress);
            expect(filepicker.urls.constructStoreUrl).toHaveBeenCalledWith({
                storage: 'AZURE',
                filename: 'imgix.html'
            });
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                url: "https://www.filepicker.io/api/file/yeah3",
                filename: "imgix.html",
                mimetype: "text/html",
                size: 240,
                isWriteable: true
            });
            expect(error).not.toHaveBeenCalled();
            expect(progress).toHaveBeenCalledWith(100);
        });
    });

    it("can stat a FPUrl", function(){
        var url = "/library/file/stat/success";
        var options = {
            filename: true,
            mimetype: true,
            size: true,
            uploaded: true
        };
        var success,error;

        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            filepicker.files.stat(url, options, success, error);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalledWith({
                filename: "stattest.png",
                mimetype: "image/png",
                size: 42,
                uploaded: new Date(1349935525383)
            });
            expect(error).not.toHaveBeenCalled();
        });
    });

    it("can remove a FPUrl", function(){
        var url = "/library/file/remove/success";
        //we need a key for removes
        filepicker.apikey = "12345";
        var success,error;

        runs(function(){
            success = jasmine.createSpy("success");
            error = jasmine.createSpy("error");
            filepicker.files.remove(url, {}, success, error);
        });
        waitsFor(function(){
            return success.wasCalled || error.wasCalled;
        }, "the callback to occur", 2000);
        runs(function(){
            expect(success).toHaveBeenCalled();
            expect(error).not.toHaveBeenCalled();
        });
    });
});