import React, { useState } from 'react';
import { Save, Database, HelpCircle } from 'lucide-react';
import { saveConfig, FirebaseConfig } from '../services/firebase';

export const Setup: React.FC = () => {
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      [e.target.name]: e.target.value.trim()
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required firebase fields
    const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    // @ts-ignore
    if (required.some(field => !config[field])) {
      alert("Please fill in all Firebase fields.");
      return;
    }
    saveConfig(config);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        
        <div className="bg-indigo-600 p-6 text-center">
          <Database className="w-12 h-12 text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">App Configuration</h1>
          <p className="text-indigo-100 text-sm mt-2">
            Connect your cloud storage to enable the app.
          </p>
        </div>

        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto">
          <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-700 text-sm text-slate-400">
            <h3 className="text-indigo-400 font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Setup Instructions
            </h3>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Create a project at <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">firebase.google.com</a>.</li>
              <li>Add a Web App to get the SDK Config.</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <h4 className="text-white font-medium border-b border-slate-700 pb-2">Firebase Storage (Required)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                  <input
                    type="text"
                    name="apiKey"
                    value={config.apiKey}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Project ID</label>
                  <input
                    type="text"
                    name="projectId"
                    value={config.projectId}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Auth Domain</label>
                  <input
                    type="text"
                    name="authDomain"
                    value={config.authDomain}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Storage Bucket</label>
                  <input
                    type="text"
                    name="storageBucket"
                    value={config.storageBucket}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Messaging Sender ID</label>
                  <input
                    type="text"
                    name="messagingSenderId"
                    value={config.messagingSenderId}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">App ID</label>
                  <input
                    type="text"
                    name="appId"
                    value={config.appId}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-6"
            >
              <Save className="w-5 h-5" /> Save Configuration
            </button>
          </form>
        </div>
      </div>
      <p className="mt-8 text-slate-500 text-xs">SecureEvent Pass • v1.1</p>
    </div>
  );
};