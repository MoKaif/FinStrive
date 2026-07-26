import React, { useEffect, useState } from 'react';
import { getPeriodReturns, getPerformance, setSession, getSession } from '../../Services/PortfolioService';
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [periodData, setPeriodData] = useState<any>(null);
    const [perfData, setPerfData] = useState<any>(null);
    const [session, setSess] = useState('');

    useEffect(() => { fetch(); fetchSess(); }, []);

    const fetch = async () => {
        try {
            const pd = await getPeriodReturns('91252757', '1D');
            const pf = await getPerformance('91252757', 'ALL');
            setPeriodData(pd);
            setPerfData(pf);
        } catch (err) { console.error(err); }
    }

    const fetchSess = async () => {
        try {
            const res = await getSession();
            setSess(res.session || '');
        } catch (err) { }
    }

    const saveSession = async () => {
        try {
            await setSession(session);
            alert('Saved');
        } catch (err) { alert('Failed'); }
    }

    // Transform perfData into chart-friendly structures if available
    const lineData = (perfData && perfData.data && perfData.data.dates) ? perfData.data.dates.map((d:any, i:number) => ({ date: d, value: perfData.data.values[i] })) : [];
    const pieData = (perfData && perfData.data && perfData.data.breakdown) ? perfData.data.breakdown.map((b:any)=>({ name: b.name, value: b.value })) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card w-full max-w-4xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg text-white font-semibold">Portfolio Info</h3>
                    <div className="flex items-center gap-2">
                        <input value={session} onChange={e=>setSess(e.target.value)} placeholder="PHPSESSID" className="input-field" />
                        <button onClick={saveSession} className="btn-primary">Save</button>
                        <button onClick={onClose} className="text-slate-400">Close</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded">
                        <h4 className="text-sm text-slate-300 mb-2">Performance (line)</h4>
                        <div style={{ height: 300 }}>
                            {lineData.length > 0 ? (
                                <ResponsiveContainer>
                                    <LineChart data={lineData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <div className="text-slate-400">No performance data</div>}
                        </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded">
                        <h4 className="text-sm text-slate-300 mb-2">Overview (pie)</h4>
                        <div style={{ height: 300 }}>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                                            {pieData.map((entry:any, idx:number)=> <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <div className="text-slate-400">No overview data</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InfoModal;
