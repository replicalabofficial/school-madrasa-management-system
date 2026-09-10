namespace School_Madrasa_Management_System.Web.Services;

public class UserRoleState
{
    public event Action? OnChange;

    private string _currentRole = "head-office";

    public string CurrentRole => _currentRole;

    public string UserName =>
        _currentRole switch
        {
            "branch-01" => "Accountant",
            "branch-02" => "Accountant",
            _ => "Mr. Adnan"
        };

    public string UserRole =>
        _currentRole switch
        {
            "branch-01" => "Branch User · Branch 01",
            "branch-02" => "Branch User · Branch 02",
            _ => "Head Office Admin"
        };

    public string TopbarRole =>
        _currentRole switch
        {
            "branch-01" => "Branch 01",
            "branch-02" => "Branch 02",
            _ => "Head Office"
        };

    public void SetRole(string role)
    {
        if (_currentRole == role)
            return;

        _currentRole = role;

        OnChange?.Invoke();
    }
}