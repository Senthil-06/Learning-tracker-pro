import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { User, Mail, Calendar, Shield } from "lucide-react";

export default function Profile() {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Profile</h2>
                <p className="text-slate-500">Manage your account settings and preferences</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 flex flex-col items-center border-b border-slate-100 bg-slate-50/50">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                        <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{user.email.split('@')[0]}</h3>
                    <p className="text-slate-500 text-sm mt-1">{user.role}</p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                        <Mail className="w-5 h-5 text-slate-400 mr-4" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Email Address</p>
                            <p className="text-slate-900">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-slate-400 mr-4" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Joined Date</p>
                            <p className="text-slate-900">{format(new Date(user.created_at), "MMMM d, yyyy")}</p>
                        </div>
                    </div>
                    <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                        <Shield className="w-5 h-5 text-slate-400 mr-4" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Account Role</p>
                            <p className="text-slate-900 capitalize">{user.role}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={logout}
                    className="px-6 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
