import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Cell,
    PieChart,
    Pie,
    LineChart,
    Line
} from "recharts";
import {
    Clock,
    BookOpen,
    Flame,
    TrendingUp,
    MoreHorizontal,
    Play,
    AlertTriangle
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { cn } from "../lib/utils";
import { format, subDays, startOfWeek, addDays } from "date-fns";

const Card = ({ children, className }) => (
    <div className={cn("bg-white p-6 rounded-xl shadow-sm border border-slate-100", className)}>
        {children}
    </div>
);

const StatCard = ({ icon: Icon, label, value, subtext, colorClass }) => (
    <Card>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
            <div className={cn("p-2 rounded-lg", colorClass)}>
                <Icon className="w-5 h-5 text-white" />
            </div>
        </div>
    </Card>
);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
    const [weeklyData, setWeeklyData] = useState([]);
    const [streakData, setStreakData] = useState({ current_streak: 0, longest_streak: 0 });
    const [ongoingItems, setOngoingItems] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [dropoffData, setDropoffData] = useState({ count: 0, items: [] });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [weeklyRes, streakRes, ongoingRes, catRes, dropoffRes] = await Promise.all([
                    api.get("/analytics/weekly-time?weeks=8"),
                    api.get("/analytics/streak"),
                    api.get("/learning-items/ongoing?limit=5"),
                    api.get("/analytics/subject-breakdown"),
                    api.get("/analytics/dropoff?days=7")
                ]);

                setWeeklyData(weeklyRes.data);
                setStreakData(streakRes.data);
                setOngoingItems(ongoingRes.data);
                setSubjects(catRes.data);
                setDropoffData(dropoffRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
    }

    // Process data for charts
    const totalHours = Math.round(weeklyData.reduce((acc, curr) => acc + curr.total_minutes, 0) / 60 * 10) / 10;

    // Sort recently active items
    const recentItems = [...ongoingItems].sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                <p className="text-slate-500">Track your learning progress and study habits</p>
            </div>

            {/* Dropoff Warning Banner */}
            {dropoffData?.count > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-2 text-amber-800 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <h3 className="font-semibold">Needs Attention</h3>
                    </div>
                    <p className="text-sm text-amber-700/80 mb-4">
                        You have {dropoffData.count} subject{dropoffData.count === 1 ? '' : 's'} slipping away. Drop a short session today to keep your streak alive!
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {dropoffData.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => navigate('/subjects')}
                                className="flex items-center px-3 py-1.5 bg-white border border-amber-200 hover:border-amber-300 hover:bg-amber-100 rounded-lg text-sm font-medium text-amber-800 transition-colors shadow-sm active:scale-95"
                                title="Click to view all subjects"
                            >
                                <span className="truncate max-w-[150px]">{item.title}</span>
                                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs whitespace-nowrap">
                                    {item.days_since_last_activity} days idle
                               </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Clock}
                    label="Total Study Hours"
                    value={`${totalHours}h`}
                    subtext="All time"
                    colorClass="bg-blue-500"
                />
                <StatCard
                    icon={BookOpen}
                    label="Active Items"
                    value={ongoingItems.length}
                    subtext="In progress"
                    colorClass="bg-emerald-500"
                />
                <StatCard
                    icon={Flame}
                    label="Current Streak"
                    value={`${streakData.current_streak} days`}
                    subtext="Keep it up!"
                    colorClass="bg-orange-500"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Longest Streak"
                    value={`${streakData.longest_streak} days`}
                    subtext="Personal best"
                    colorClass="bg-purple-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Study Hours (Using Weekly Data) */}
                <Card>
                    <h3 className="font-semibold text-slate-900 mb-4">Weekly Study Minutes</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="week_start"
                                    tickFormatter={(str) => format(new Date(str), "MMM d")}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="total_minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Subject Distribution */}
                <Card>
                    <h3 className="font-semibold text-slate-900 mb-4">Subject Distribution</h3>
                        <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="60%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={subjects}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        dataKey="total_minutes"
                                        nameKey="subject"
                                    >
                                    {subjects.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                    </Pie>
                                    <RechartsTooltip />
                                 </PieChart>
                            </ResponsiveContainer>
                        <div className="ml-4 space-y-2">
                        {subjects.filter(entry=>entry.total_minutes>0).map((entry, index) => (
                            <div key={entry.subject} className="flex items-center text-sm">  {/* fix 3 */}
                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-slate-600">{entry.subject}</span>  {/* fix 2 */}
                            </div>
                        ))}
                    </div>
                </div>
                </Card>
                </div>

            {/* Recent Activity / Ongoing Items */}
            <Card>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-slate-900">Recent Learning Items</h3>
                    {/* <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button> */}
                </div>
                <div className="space-y-4">
                    {recentItems.length === 0 ? (
                        <p className="text-slate-500 text-sm">No active items found.</p>
                    ) : (
                        recentItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-900">{item.title}</h4>
                                        <p className="text-sm text-slate-500">{item.subject_code} • {item.status}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-900">{Math.round(item.total_minutes / 60 * 10) / 10}h total</p>
                                    <p className="text-xs text-slate-400">Last active {format(new Date(item.last_activity), "MMM d")}</p>
                                </div>
                                {/* <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                    <Play className="w-4 h-4" />
                                </button> */}
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}
