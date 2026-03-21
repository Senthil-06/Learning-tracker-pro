import { useState, useEffect } from "react";
import api from "../api/client";
import { format } from "date-fns";
import { BookOpen, CheckCircle2, Edit2, Archive, RefreshCw, X, Check, Search, Plus, Play, Loader2 } from "lucide-react";

export default function Subjects() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ongoing"); // ongoing, completed, archived
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubjectCode, setEditSubjectCode] = useState("");

  // Track Session & Quick Create State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoggingSession, setIsLoggingSession] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Track Session Form
  const [selectedItemId, setSelectedItemId] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  // New Item Form
  const [newTitle, setNewTitle] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("Medium"); // Easy, Medium, Hard

  const getDifficultyConfig = (diff) => {
      // Direct mapping for Enum values
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
      let endpoint = "/learning-items/ongoing";
      if (activeTab === "completed") endpoint = "/learning-items/completed";
      if (activeTab === "archived") endpoint = "/learning-items/archived";
      
      const res = await api.get(endpoint);
      setItems(res.data);
      if (activeTab === "ongoing" && res.data.length > 0 && !selectedItemId) {
        setSelectedItemId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    setSearchQuery("");
    setEditingId(null);
    setIsCreatingNew(false);
    setIsLoggingSession(false);
  }, [activeTab]);

  const handleEditInit = (item) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditSubjectCode(item.subject_code);
  };

  const handleEditSave = async (id) => {
    try {
      await api.patch(`/learning-items/${id}`, {
        title: editTitle,
        subject_code: editSubjectCode,
      });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update item");
    }
  };

  const handleMarkComplete = async (id) => {
    try {
      await api.patch(`/learning-items/${id}`, { status: "completed" });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || "Make sure you have logged at least one session before completing an item.");
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.patch(`/learning-items/${id}`, { archive: true });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to archive item");
    }
  };

  const handleUnarchive = async (id) => {
    try {
      await api.patch(`/learning-items/${id}`, { unarchive: true });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to unarchive item");
    }
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !duration) return;
    setFormSubmitting(true);
    try {
      await api.post(`/learning-items/${selectedItemId}/sessions`, {
        duration_minutes: parseInt(duration),
        notes: notes || null,
      });
      setDuration("");
      setNotes("");
      setIsLoggingSession(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to log session");
    } finally {
      setFormSubmitting(false);
    }
  };

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
      setSelectedItemId(res.data.id.toString());
      setIsCreatingNew(false);
      setIsLoggingSession(true); // Open track session for the new item
      setNewTitle("");
      setNewSubjectCode("");
      setNewDifficulty("Medium");
      await fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create subject. Ensure the title and subject code are unique.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.subject_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Learning Subjects</h2>
          <p className="text-slate-500">Manage your study topics and log sessions</p>
        </div>
        
        {activeTab !== "archived" && (
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search subjects..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        )}
      </div>

      <div className="flex justify-between items-center border-b border-slate-200">
        <div className="flex  w-full sm:w-auto">
          {["ongoing", "completed", "archived"].map(tab => (
              <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 text-sm font-medium transition-colors border-b-2 -mb-px capitalize whitespace-nowrap ${
                      activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                  {tab}
              </button>
          ))}
        </div>
        {!isCreatingNew && !isLoggingSession && (
          <div className="hidden sm:flex space-x-2 flex-shrink-0">
            <button 
              onClick={() => setIsLoggingSession(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              Log Session
            </button>
            <button 
              onClick={() => setIsCreatingNew(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Subject
            </button>
          </div>
        )}
      </div>

      {/* Inline Forms Section */}
      {isCreatingNew && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. FastAPI Basics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  maxLength="10"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 uppercase"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              {formSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save New Subject"}
            </button>
          </form>
        </div>
      )}

      {isLoggingSession && !isCreatingNew && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-slate-900">Log Study Session</h3>
              <button 
                type="button" 
                onClick={() => setIsLoggingSession(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Subject</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  {items.length === 0 && <option value="" disabled>No active subjects. Create one first!</option>}
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.subject_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you learn?"
              />
            </div>

            <button
              type="submit"
              disabled={formSubmitting || items.length === 0}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {formSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log Session"}
            </button>
          </form>
        </div>
      )}

      {/* Mobile Grid List Buttons */}
      <div className="flex sm:hidden w-full gap-2 mb-4">
        {!isCreatingNew && !isLoggingSession && (
            <>
              <button 
                onClick={() => setIsLoggingSession(true)}
                className="flex-1 flex justify-center items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Log Session
              </button>
              <button 
                onClick={() => setIsCreatingNew(true)}
                className="flex-1 flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                New Subject
              </button>
            </>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading data...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-100 text-center text-slate-500">
          No {activeTab} items found{searchQuery && " matching your search"}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isEditing = editingId === item.id;
            const diffConfig = getDifficultyConfig(item.difficulty);
            
            return (
                <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    
                    {item.status === "completed" && !isEditing && (
                        <div className="absolute top-0 right-0 p-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                    )}
                    
                    {/* Action Buttons Overlay */}
                    {!isEditing && (
                        <div className="absolute top-3 right-3 flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-100">
                            {activeTab === "ongoing" && (
                                <>
                                    <button onClick={() => { setIsLoggingSession(true); setSelectedItemId(item.id.toString()); setIsCreatingNew(false); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Log Session for this subject">
                                        <Play className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleEditInit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Edit">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleMarkComplete(item.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors" title="Mark as Complete">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            {activeTab !== "archived" && (
                                <button onClick={() => handleArchive(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Archive">
                                    <Archive className="w-4 h-4" />
                                </button>
                            )}
                            {activeTab === "archived" && (
                                <button onClick={() => handleUnarchive(item.id)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Unarchive">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Title</label>
                                <input 
                                    type="text" 
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full mt-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Subject Code</label>
                                <input 
                                    type="text" 
                                    maxLength="10"
                                    value={editSubjectCode}
                                    onChange={e => setEditSubjectCode(e.target.value.toUpperCase())}
                                    className="w-full mt-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white uppercase"
                                />
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleEditSave(item.id)} className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded">
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start space-x-3 mb-4 pr-16 md:pr-12">
                                <div className={`p-2 rounded-lg ${activeTab === 'ongoing' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 truncate" title={item.title}>{item.title}</h3>
                                    <div className="flex items-center space-x-2 mt-1 relative z-0">
                                        <p className="text-xs text-slate-500 font-mono tracking-wide">{item.subject_code}</p>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diffConfig.color}`}>
                                            {diffConfig.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm relative z-0">
                                {item.created_at && (
                                    <div className="flex justify-between items-center text-slate-500">
                                        <span>Created</span>
                                        <span className="text-slate-900 font-medium">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                                    </div>
                                )}
                                {item.total_minutes !== undefined && (
                                    <div className="flex justify-between items-center text-slate-500">
                                        <span>Total Time</span>
                                        <span className="text-slate-900 font-medium">
                                            {Math.floor(item.total_minutes / 60)}h {item.total_minutes % 60}m
                                        </span>
                                    </div>
                                )}
                                {item.last_activity && (
                                    <div className="flex justify-between items-center text-slate-500">
                                        <span>Last Active</span>
                                        <span className="text-slate-900 font-medium">{format(new Date(item.last_activity), "MMM d")}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )})}
        </div>
      )}
    </div>
  );
}
