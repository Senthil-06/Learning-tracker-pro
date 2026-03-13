import { useState, useEffect } from "react";
import api from "../api/client";
import { format } from "date-fns";
import { BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";

export default function History() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const [completedItems, archivedItems] = await Promise.all([
                    api.get("/learning-items/completed"),
                    api.get("/learning-items/archived")
                ])
                setItems([...completedItems.data,...archivedItems.data]);
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Learning Subjects</h2>
                <p className="text-slate-500">Manage and review your study topics</p>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">Loading data...</div>
            ) : items.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-100 text-center text-slate-500">
                    No items found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                            {item.status === "completed" && (
                                <div className="absolute top-0 right-0 p-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                </div>
                            )}
                            <div className="flex items-center space-x-3 mb-4">
                                <div className={'p-2 rounded-lg bg-slate-100 text-slate-600'}>
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 pr-8 line-clamp-1">{item.title}</h3>
                                    <p className="text-xs text-slate-500">{item.category}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Created:</span>
                                    <span className="text-slate-900 font-medium">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                                </div>
                                {item.total_minutes !== undefined && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Total Time:</span>
                                        <span className="text-slate-900 font-medium">
                                            {Math.floor(item.total_minutes / 60)}h {item.total_minutes % 60}m
                                        </span>
                                    </div>
                                )}
                                {item.last_activity && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Last Active:</span>
                                        <span className="text-slate-900 font-medium">{format(new Date(item.last_activity), "MMM d")}</span>
                                    </div>
                                )}
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
