export default function AdminDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Platform Admin Dashboard</h1>
      <p className="text-muted-foreground">Welcome, Super User! You have full access to everything.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-2">Email Templates</h3>
          <p className="text-sm text-muted-foreground mb-4">Manage system emails like password reset, welcome emails, etc.</p>
          <a href="/admin/email-templates" className="text-blue-600 text-sm font-medium hover:underline">Manage Templates &rarr;</a>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-2">Assets</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload and manage images, CSS files, and other assets in DO Spaces.</p>
          <a href="/admin/assets" className="text-blue-600 text-sm font-medium hover:underline">Manage Assets &rarr;</a>
        </div>
      </div>
    </div>
  );
}
