import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Download, Monitor, Share2, Info } from 'lucide-react';

const AdminQRView = () => {
    const [stationId] = useState('ST-COLOMBO-01'); // Mock station ID for now
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const refreshQR = () => {
        setLastRefreshed(new Date());
    };

    const qrValue = JSON.stringify({
        stationId,
        timestamp: lastRefreshed.getTime(),
        type: 'STATION_CHECKIN'
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-light text-slate-900 mb-2">Station Check-in QR</h1>
                    <p className="text-slate-500">Display this QR code at the station for employee clock-in</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* QR Code Display Card */}
                    <div className="bg-white rounded-[40px] p-12 shadow-2xl shadow-blue-500/10 border border-slate-100 flex flex-col items-center gap-8 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

                        <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 transition-transform group-hover:scale-105 duration-500">
                            <QRCodeSVG
                                value={qrValue}
                                size={256}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: "https://cdn-icons-png.flaticon.com/512/847/847969.png", // Just a fuel icon placeholder
                                    x: undefined,
                                    y: undefined,
                                    height: 48,
                                    width: 48,
                                    excavate: true,
                                }}
                            />
                        </div>

                        <div className="text-center">
                            <div className="text-xl font-semibold text-slate-900 mb-1">{stationId}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Official Monitoring Station</div>
                        </div>

                        <button
                            onClick={refreshQR}
                            className="flex items-center gap-2 text-blue-600 font-semibold text-sm hover:underline"
                        >
                            <RefreshCw size={16} className={Date.now() - lastRefreshed.getTime() < 1000 ? 'animate-spin' : ''} />
                            Refresh Token
                        </button>
                    </div>

                    {/* Stats & Actions */}
                    <div className="space-y-6">
                        <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-500/30">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-white/20 rounded-2xl">
                                    <Monitor className="text-white" size={24} />
                                </div>
                                <h3 className="text-xl font-semibold">Active Display</h3>
                            </div>
                            <p className="text-blue-100 text-sm leading-relaxed mb-6">
                                This QR code uses a secure dynamic token system. Employees must scan this while being physically present at the station.
                            </p>
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest opacity-80">
                                <span>Status: Online</span>
                                <span>v2.0 Secured</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                            <h4 className="text-slate-900 font-semibold mb-6 flex items-center gap-2">
                                <Info size={18} className="text-blue-600" />
                                Administrator Tools
                            </h4>
                            <div className="space-y-4">
                                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                    <span className="text-sm font-medium text-slate-700">Download for Print</span>
                                    <Download size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                    <span className="text-sm font-medium text-slate-700">Push to Station Display</span>
                                    <Share2 size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminQRView;
