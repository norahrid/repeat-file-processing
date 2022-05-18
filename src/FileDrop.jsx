import React, { useState } from "react";
import Dropzone from 'react-dropzone';

const FileDrop = (props) => {

    const [fileList, setFileList] = useState([]);
    
    const getFileByPath = (file, nonArrayType = false) => {
        return new Promise(function(resolve, reject) {
            let reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target.result);
            }
            reader.onerror = () => {
                reject();
            }
            if (file) {
                if (nonArrayType) {
                    reader.readAsText(file);
                } else {
                    reader.readAsArrayBuffer(file);
                }
    
            } else {
                reject();
            }
        });
    }


    const onProcessFile = async () => {

        if (fileList.length > 0) {
            for (const [fileIndex, file] of fileList.entries()) {
                const fileContents = await getFileByPath(file);
                console.log(fileContents);
            }
        }
        console.log(fileList)
    }

    return (
    <div className="App">
        <Dropzone onDrop={fileList => setFileList(fileList)}>
            {({getRootProps, getInputProps}) => (
            <section>
                <div {...getRootProps()}>
                <input {...getInputProps()} />
                <p>Drag and drop here</p>
                </div>
            </section>
            )}
        </Dropzone>
        <button onClick={onProcessFile}>
            <span>{"PROCESS"}</span>
        </button>

  </div>
 
  );
};

export default FileDrop;
