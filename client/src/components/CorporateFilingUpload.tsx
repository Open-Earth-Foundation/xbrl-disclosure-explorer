import React, {useState} from 'react';
import {Card, CardContent} from "./ui/card";
import {Button} from "./ui/button";
import {Database, FileText, Upload} from "lucide-react";
import {useToast} from "../hooks/use-toast";
import {getUserId} from "@/user-id";

const API_BASE_URL =
    globalThis?.config?.VITE_API_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000";

type UploadStatus = {
    type: 'none' | 'preloaded' | 'xbrl' | 'json';
    filename?: string;
};

export default function CorporateFilingUpload() {
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>({type: 'none'});
    const [loading, setLoading] = useState(false);
    const {toast} = useToast();
    const userId = getUserId();

    const usePreloaded = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/switch_mode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'websocket_user_id': userId || '',
                    'new_mode': 'preloaded',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to switch to preloaded mode');
            }

            setUploadStatus({
                type: 'preloaded',
                filename: 'Sample ESRS Filing'
            });

            toast({
                title: "Success",
                description: "Using preloaded ESRS sample file"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to use preloaded file",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleXbrlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('websocket_user_id', userId || '');

            const response = await fetch(API_BASE_URL + '/upload_file', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            setUploadStatus({
                type: 'xbrl',
                filename: file.name
            });

            toast({
                title: "Success",
                description: "XBRL file uploaded and processed successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to process XBRL file",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('websocket_user_id', userId || '');

            const response = await fetch(API_BASE_URL + '/upload_json_file', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            setUploadStatus({
                type: 'json',
                filename: file.name
            });

            toast({
                title: "Success",
                description: "JSON file uploaded successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to upload JSON file",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">Corporate Filing</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {/* Preloaded Option */}
                    <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <FileText className="h-5 w-5 text-blue-600"/>
                            <h3 className="font-medium">Don't have a file?</h3>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="block  text-sm text-blue-700
                                                    py-2 px-4 rounded-full border-0
                                                    bg-blue-50 hover:bg-blue-100"
                            onClick={usePreloaded}
                            disabled={loading}
                        >
                            Use a Preloaded Mockup File
                        </Button>
                    </div>

                    {/* XBRL Upload Option */}
                    <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <Upload className="h-5 w-5 text-green-600"/>
                            <h3 className="font-medium">Have an XBRL file?</h3>
                        </div>
                        <div className="ml-6">
                            <input
                                type="file"
                                id="xbrl-upload"
                                onChange={handleXbrlUpload}
                                accept=".xml,.xbrl,.zip"
                                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* JSON Upload Option */}
                    <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <Database className="h-5 w-5 text-purple-600"/>
                            <h3 className="font-medium">Have a JSON filing?</h3>
                        </div>
                        <div className="ml-6">
                            <input
                                type="file"
                                id="json-upload"
                                onChange={handleJsonUpload}
                                accept=".json"
                                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-50 file:text-purple-700
                  hover:file:bg-purple-100"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Status Display */}
                {loading && (
                    <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded">
                        Processing...
                    </div>
                )}

                {(!loading && uploadStatus.type !== 'none') && (
                    <div className="mt-2 p-2 bg-green-50 text-green-700 rounded flex items-center gap-2">
                        <div className="font-medium">Using:</div>
                        {uploadStatus.type === 'preloaded' ? 'Preloaded Mockup File' : uploadStatus.filename}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
