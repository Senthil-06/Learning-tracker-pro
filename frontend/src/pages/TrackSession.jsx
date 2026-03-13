import { useState, useEffect } from "react";
import api from "../api/client";
import { cn } from "../lib/utils";
import { CheckCircle2, Loader2, Plus } from "lucide-react";

export default function TrackSession() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Form State
    const [selectedItemId, setSelectedItemId] = useState("");
    const [duration, setDuration] = useState("");
    const [notes, setNotes] = useState("");

    // New Item State (Quick Create)
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newCategory, setNewCategory] = useState("Hobbies");
    const [newDifficulty, setNewDifficulty] = useState("1");

    const categories = [ "Hobbies", "Skill_up", "Responsibilities", "Acedemics", "Miscellaneous"];

    const fetchItems = async () => {
        try {
            const res = await api.get("/learning-items/ongoing");
            setItems(res.data);
            if (res.data.length > 0 && !selectedItemId) {
                setSelectedItemId(res.data[0].id.toString());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleTrackSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItemId || !duration) return;

        setSubmitting(true);
        setSuccessMsg("");
        setErrorMsg("");

        try {
            await api.post(`/learning-items/${selectedItemId}/sessions`, {
                duration_minutes: parseInt(duration),
                notes: notes || null,
            });
            setSuccessMsg("Session logged successfully!");
            setDuration("");
            setNotes("");
            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to log session");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateNewItem = async (e) => {
        e.preventDefault();
        if (!newTitle) return;

        setSubmitting(true);
        setErrorMsg("");
        try {
            console.log(newCategory);
            const res = await api.post("/learning-items", {
                title: newTitle,
                category: newCategory,
                difficulty: parseInt(newDifficulty),
            });
            // Select the newly created item
            setSelectedItemId(res.data.id.toString());
            setIsCreatingNew(false);
            setNewTitle("");
            await fetchItems(); // Refresh the list
        } catch (err) {

            console.log(err);
            const detail = err.response?.data?.detail;
setErrorMsg(
    Array.isArray(detail)
        ? detail.map(d => d.msg).join(", ")
        : detail || "Failed to create item"
);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading items...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Track Session</h2>
                <p className="text-slate-500">Log your study time for an ongoing topic.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                {successMsg && (
                    <div className="mb-6 p-4 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
                        {errorMsg}
                    </div>
                )}

                {isCreatingNew ? (
                    <form onSubmit={handleCreateNewItem} className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-slate-900">Create New Subject</h3>
                            <button
                                type="button"
                                onClick={() => setIsCreatingNew(false)}
                                className="text-sm text-slate-500 hover:text-slate-700"
                            >
                                Cancel
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g. FastAPI Basics"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    value={newDifficulty}
                                    onChange={(e) => setNewDifficulty(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save New Subject"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleTrackSubmit} className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700">Subject / Topic</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingNew(true)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> New Subject
                                </button>
                            </div>
                            <select
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                            >
                                {items.length === 0 && <option value="" disabled>No active subjects. Create one first!</option>}
                                {items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.title} ({item.category})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Duration (minutes)
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="480"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder="e.g. 45"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                rows="3"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="What did you learn?"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || items.length === 0}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log Session"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
