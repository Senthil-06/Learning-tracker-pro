import { useState, useEffect } from "react";
import api from "../api/client";
import { BookOpen, CheckCircle2, Trash, X, Check, Search, Plus, Play, Loader2, ChevronRight, Clock, Award } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";

export default function Subjects() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("ongoing"); // ongoing, completed (removed archived from UI)
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    // Quick Create State
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [formSubmitting, setFormSubmitting] = useState(false);

    // New Item Form
    const [newTitle, setNewTitle] = useState("");
    const [newSubjectCode, setNewSubjectCode] = useState("");
    const [newDifficulty, setNewDifficulty] = useState("Medium"); // Easy, Medium, Hard

    // Multi-purpose Drawer State
    const [selectedItem, setSelectedItem] = useState(null); 
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Deletion Modal State
    const [itemToDelete, setItemToDelete] = useState(null);

    // In-Place Celebration State
    const [showCelebration, setShowCelebration] = useState(false);

    // Track Session Form inside Drawer
    const [duration, setDuration] = useState("");
    const [notes, setNotes] = useState("");
    const [loggingSession, setLoggingSession] = useState(false);

    const getDifficultyConfig = (diff) => {
        switch(diff) {
            case 'Easy': return { label: 'Easy', color: 'bg-emerald-100 text-emerald-700' };
            case 'Medium': return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
            case 'Hard': return { label: 'Hard', color: 'bg-red-100 text-red-700' };
            default: return { label: diff || 'Unknown', color: 'bg-slate-100 text-slate-700' };
        }
    }

    const fetchItems = async () => {
        setLoading(true);
        try {
            let endpoint = activeTab === "completed" ? "/learning-items/completed" : "/learning-items/ongoing";
            const res = await api.get(endpoint);
            setItems(res.data);
            
            // If the drawer is currently open, refresh its specific data seamlessly
            if (isDrawerOpen && selectedItem) {
                const updatedItem = res.data.find(i => i.id === selectedItem.id);
                if (updatedItem) {
                    setSelectedItem(updatedItem);
                }
            }
        } catch (err) {
            console.error("Failed to fetch subjects", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setItems([]); // Clear old items instantly to prevent UI flashes
        fetchItems();
        setSearchQuery("");
        setIsCreatingNew(false);
    }, [activeTab]);

    // Auto-open drawer from Dashboard dropoff links
    useEffect(() => {
        const autoOpenId = location.state?.autoOpenSubjectId;
        if (autoOpenId) {
            // Strip the state from router history so it doesn't re-trigger on reload
            navigate(location.pathname, { replace: true, state: {} });
            
            // Force the tab to "ongoing" since dropoffs are ongoing items
            if (activeTab !== "ongoing") {
                setActiveTab("ongoing");
            }
            
            const fetchAndOpen = async () => {
                try {
                    // Fetch specifically by ID rather than relying on paginated List
                    const res = await api.get(`/learning-items/${autoOpenId}`);
                    openDrawer(res.data);
                } catch (err) {
                    toast.error("Failed to jump to the subject.");
                }
            };
            fetchAndOpen();
        }
    }, [location.state, navigate, activeTab]);

    const handleCreateNewItem = async (e) => {
        e.preventDefault();
        if (!newTitle || !newSubjectCode) return;
        setFormSubmitting(true);
        try {
            const res = await api.post("/learning-items", {
                title: newTitle,
                subject_code: newSubjectCode,
                difficulty: newDifficulty,
            });
            setIsCreatingNew(false);
            setNewTitle("");
            setNewSubjectCode("");
            setNewDifficulty("Medium");
            await fetchItems();
            
            // Auto open the drawer for the newly created subject!
            // Wait a brief moment to let state settle
            setTimeout(async () => {
                const latestRes = await api.get("/learning-items/ongoing");
                const created = latestRes.data.find(i => i.id === res.data.id);
                if (created) openDrawer(created);
            }, 300);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create subject. Ensure the title is unique.");
        } finally {
            setFormSubmitting(false);
        }
    };

    const executeDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.patch(`/learning-items/${itemToDelete.id}`, { archive: true });
            if (selectedItem?.id === itemToDelete.id) closeDrawer();
            fetchItems();
            toast.success("Subject deleted successfully.");
            setItemToDelete(null);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to delete item");
        }
    };

    // ----- Drawer & Unit Functions -----

    const openDrawer = (item) => {
        setSelectedItem(item);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedItem(null), 300); // allow animation to finish
    };

    const handleTrackSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem || !duration) return;
        setLoggingSession(true);
        try {
            await api.post(`/learning-items/${selectedItem.id}/sessions`, {
                duration_minutes: parseInt(duration),
                notes: notes || null,
            });
            setDuration("");
            setNotes("");
            fetchItems(); // Will silently refresh the drawer's item total_minutes
            toast.success("Session logged!");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to log session");
        } finally {
            setLoggingSession(false);
        }
    };

    const handleToggleUnit = async (unitId, unitNumber, type, currentValue) => {
        if (!selectedItem) return;
        const payload = type === "two_marks" 
            ? { two_marks_completed: !currentValue } 
            : { eleven_marks_completed: !currentValue };
            
        try {
            // Optimistic update for incredibly satisfying UX
            const updatedUnits = selectedItem.units.map(u => 
                u.id === unitId ? { ...u, ...payload } : u
            );
            setSelectedItem({...selectedItem, units: updatedUnits});

            // Fire to backend
            await api.patch(`/learning-items/${selectedItem.id}/units/${unitNumber}`, payload);
            
            // Check for Auto-Completion
            const tickedCount = updatedUnits.reduce((acc, u) => acc + (u.two_marks_completed ? 1 : 0) + (u.eleven_marks_completed ? 1 : 0), 0);
            if (tickedCount === 10 && selectedItem.status !== "completed") {
                await api.patch(`/learning-items/${selectedItem.id}`, { status: "completed" });
                fetchItems();
                closeDrawer();
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 2500);
            } else {
                fetchItems(); // Silently sync real data
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to update unit progress");
            fetchItems(); // revert optimistic update
        }
    };

    const handleSaveUnitName = async (unitNumber, newName) => {
        if (!selectedItem) return;
        try {
            await api.patch(`/learning-items/${selectedItem.id}/units/${unitNumber}`, { name: newName });
            fetchItems();
        } catch (err) {
             toast.error(err.response?.data?.detail || "Failed to rename unit");
        }
    };

    // Derived Progress Calculation
    const getProgressPercentage = (item) => {
        if (!item || !item.units) return 0;
        const totalTasks = item.units.length * 2;
        if (totalTasks === 0) return 0;
        let completed = 0;
        item.units.forEach(u => {
            if (u.two_marks_completed) completed++;
            if (u.eleven_marks_completed) completed++;
        });
        return Math.round((completed / totalTasks) * 100);
    };

    const filteredItems = items.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.subject_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 relative h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Learning Subjects</h2>
                    <p className="text-slate-500">Track syllabus progress and log your study sessions.</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search subjects..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200">
                <div className="flex w-full sm:w-auto">
                    {["ongoing", "completed"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); closeDrawer(); }}
                            className={`py-4 px-6 text-sm font-medium transition-colors border-b-2 -mb-px capitalize whitespace-nowrap ${
                                activeTab === tab
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                            }`}
                        >
                            {tab} Subjects
                        </button>
                    ))}
                </div>
                {activeTab === "ongoing" && !isCreatingNew && (
                    <button 
                        onClick={() => setIsCreatingNew(true)}
                        className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Subject
                    </button>
                )}
            </div>

            {/* Inline Quick Create Form */}
            {activeTab === "ongoing" && isCreatingNew && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Subject title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Code</label>
                                <input
                                    type="text"
                                    required
                                    maxLength="10"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 uppercase transition-colors"
                                    value={newSubjectCode}
                                    onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                                    placeholder="Subject code"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                                    value={newDifficulty}
                                    onChange={(e) => setNewDifficulty(e.target.value)}
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                        </div>
                        
                        <button
                            type="submit"
                            disabled={formSubmitting}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-[0.99]"
                        >
                            {formSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save & Open Syllabus"}
                        </button>
                    </form>
                </div>
            )}

            {/* Mobile New Subject Button */}
            <div className="flex sm:hidden w-full mb-4">
                {activeTab === "ongoing" && !isCreatingNew && (
                    <button 
                        onClick={() => setIsCreatingNew(true)}
                        className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Subject
                    </button>
                )}
            </div>

            {loading ? (
                <div className="py-12 flex justify-center text-blue-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    No {activeTab} subjects found{searchQuery && " matching your search"}.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item) => {
                        const diffConfig = getDifficultyConfig(item.difficulty);
                        const progress = getProgressPercentage(item);
                        
                        return (
                            <div 
                                key={item.id} 
                                onClick={() => openDrawer(item)}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden group hover:-translate-y-1"
                            >
                                {/* Quick Delete Button (Visible on hover) */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }} 
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                        title="Delete Subject"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-start space-x-3 mb-4 pr-8">
                                    <div className={`p-2 rounded-lg ${progress === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {progress === 100 ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 truncate" title={item.title}>{item.title}</h3>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <p className="text-xs text-slate-500 font-mono tracking-wide">{item.subject_code}</p>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diffConfig.color}`}>
                                                {diffConfig.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2 text-sm text-slate-500 border-t border-slate-100">
                                        <div className="flex items-center">
                                            <Clock className="w-3.5 h-3.5 mr-1" />
                                            {item.total_minutes ? `${Math.floor(item.total_minutes / 60)}h ${item.total_minutes % 60}m` : '0h 0m'}
                                        </div>
                                        <div className="flex items-center text-blue-600 font-medium">
                                            {progress}%
                                            <ChevronRight className="w-4 h-4 ml-0.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* --- SLIDE-OUT DRAWER --- */}
            {/* Backdrop */}
            {isDrawerOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in cursor-pointer"
                    onClick={closeDrawer}
                ></div>
            )}

            {/* Drawer Panel */}
            <div 
                className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-slate-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 overflow-y-auto flex flex-col ${
                    isDrawerOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {selectedItem && (
                    <>
                        {/* Drawer Header */}
                        <div className="bg-white px-6 py-5 border-b border-slate-200 sticky top-0 z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-mono text-slate-400 mb-1">{selectedItem.subject_code}</p>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedItem.title}</h2>
                                </div>
                                <button 
                                    onClick={closeDrawer}
                                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Sticky Progress Bar */}
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium text-slate-700">Syllabus Progress</span>
                                <span className="font-bold text-blue-600">{getProgressPercentage(selectedItem)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-700 ease-out" 
                                    style={{ width: `${getProgressPercentage(selectedItem)}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-6 space-y-8 flex-1">
                            
                            {/* Time Logger Section */}
                            {activeTab === "ongoing" && (
                                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                                        <Clock className="w-4 h-4 mr-2 text-slate-400" /> 
                                        Log Study Session
                                    </h3>
                                    <form onSubmit={handleTrackSubmit} className="flex gap-2">
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="480"
                                            className="flex-1 w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            placeholder="Minutes..."
                                        />
                                        <button
                                            type="submit"
                                            disabled={loggingSession || !duration}
                                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 active:scale-95 whitespace-nowrap"
                                        >
                                            {loggingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Time"}
                                        </button>
                                    </form>
                                </section>
                            )}

                            {/* Units Map Section */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                                    <Award className="w-4 h-4 mr-2 text-slate-400" />
                                    Course Units
                                </h3>
                                <div className="space-y-3">
                                    {!selectedItem.units || selectedItem.units.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No units generated cleanly yet.</p>
                                    ) : (
                                        selectedItem.units.map((unit) => (
                                            <UnitCard 
                                                key={unit.id} 
                                                unit={unit} 
                                                editable={activeTab === "ongoing"}
                                                onToggle={(type, val) => handleToggleUnit(unit.id, unit.unit_number, type, val)}
                                                onRename={(newName) => handleSaveUnitName(unit.id, unit.unit_number, newName)}
                                            />
                                        ))
                                    )}
                                </div>
                            </section>

                        </div>
                    </>
                )}
            </div>

            {/* --- DELETE CONFIRMATION MODAL --- */}
            {itemToDelete && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity animate-in fade-in flex items-center justify-center p-4"
                    onClick={() => setItemToDelete(null)}
                >
                    <div 
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center sm:text-left">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete "{itemToDelete.title}"?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                This will permanently hide the subject from your dashboard and active lists. However, your total study time analytics and history will be safely preserved.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors sm:w-auto w-full"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm sm:w-auto w-full active:scale-95"
                            >
                                Yes, Delete Subject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- IN-PLACE CELEBRATION OVERLAY --- */}
{showCelebration && (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center">

            {/* Circle + ripple */}
            <div className="relative w-24 h-24 mb-6">
                {/* ripple ring behind the circle */}
                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ripple" />
                {/* main circle — bounce in */}
                <div className="absolute inset-2 bg-emerald-500 rounded-full flex items-center justify-center animate-scale-in">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
            </div>

            {/* Title — fades up after circle lands */}
            <h2 style={{ animationDelay: '350ms' }} className="text-3xl font-bold text-white tracking-wide opacity-0 animate-fade-up">
                Subject completed! 🎉
            </h2>



        </div>
    </div>
)}
        </div>
    );
}

// Separate component for Unit to manage inline editing state natively
function UnitCard({ unit, editable, onToggle, onRename }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(unit.name || `Unit ${unit.unit_number}`);

    const handleSave = () => {
        setIsEditing(false);
        if (tempName !== unit.name) {
            onRename(tempName);
        }
    };

    const isFullyComplete = unit.two_marks_completed && unit.eleven_marks_completed;

    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
            isFullyComplete ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }`}>
            <div className="flex justify-between items-center mb-3">
                {isEditing && editable ? (
                    <input 
                        type="text" 
                        autoFocus
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        className="flex-1 text-sm font-semibold text-slate-900 border-b border-blue-500 outline-none bg-transparent px-1 py-0.5"
                    />
                ) : (
                    <h4 
                        onClick={() => editable && setIsEditing(true)} 
                        className={`text-sm font-semibold cursor-text transition-colors ${isFullyComplete ? 'text-emerald-800' : 'text-slate-900 hover:text-blue-600'}`}
                        title={editable ? "Click to rename" : ""}
                    >
                        {unit.name || `Unit ${unit.unit_number}`}
                    </h4>
                )}
                {isFullyComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in" />}
            </div>
            
            <div className="space-y-2">
                <CheckboxRow 
                    label="2-Mark Questions" 
                    checked={unit.two_marks_completed} 
                    disabled={!editable}
                    onChange={() => onToggle('two_marks', unit.two_marks_completed)} 
                />
                <CheckboxRow 
                    label="11-Mark Questions" 
                    checked={unit.eleven_marks_completed} 
                    disabled={!editable}
                    onChange={() => onToggle('eleven_marks', unit.eleven_marks_completed)} 
                />
            </div>
        </div>
    );
}

// Reusable satisfying custom checkbox
function CheckboxRow({ label, checked, onChange, disabled }) {
    return (
        <label className={`flex items-center group ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
            <div className={`relative flex items-center justify-center w-5 h-5 mr-3 rounded border transition-all duration-200 ${
                checked 
                ? 'bg-blue-600 border-blue-600' 
                : 'bg-white border-slate-300 group-hover:border-blue-400'
            }`}>
                <Check className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
            </div>
            <span className={`text-sm transition-colors duration-200 ${checked ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900'}`}>
                {label}
            </span>
            {/* hidden native checkbox for accessibility */}
            <input type="checkbox" className="hidden" checked={checked} onChange={onChange} disabled={disabled} />
        </label>
    );
}
