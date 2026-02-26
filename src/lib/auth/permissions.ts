// src/lib/auth/permissions.ts - 权限管理
export type UserRole = 
  | 'service_admin'
  | 'service_engineer'
  | 'end_admin'
  | 'end_engineer';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export class PermissionManager {
  private rolePermissions: Record<UserRole, Permission[]> = {
    service_admin: [
      { resource: 'robots', action: 'manage' },
      { resource: 'tickets', action: 'manage' },
      { resource: 'customers', action: 'manage' },
      { resource: 'engineers', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'analytics', action: 'read' },
      { resource: 'settings', action: 'manage' },
    ],
    service_engineer: [
      { resource: 'robots', action: 'read' },
      { resource: 'tickets', action: 'manage' },
      { resource: 'documents', action: 'manage' },
    ],
    end_admin: [
      { resource: 'robots', action: 'manage' },
      { resource: 'tickets', action: 'manage' },
      { resource: 'engineers', action: 'manage' },
      { resource: 'documents', action: 'read' },
      { resource: 'analytics', action: 'read' },
    ],
    end_engineer: [
      { resource: 'robots', action: 'read' },
      { resource: 'tickets', action: 'manage' },
      { resource: 'documents', action: 'read' },
    ],
  };
  
  // 检查权限
  hasPermission(role: UserRole, resource: string, action: string): boolean {
    const permissions = this.rolePermissions[role] || [];
    
    // 1. 直接匹配
    const directMatch = permissions.some(permission => 
      permission.resource === resource && permission.action === action
    );
    
    if (directMatch) return true;
    
    // 2. manage 权限包含所有子权限
    const hasManagePermission = permissions.some(permission => 
      permission.resource === resource && permission.action === 'manage'
    );
    
    if (hasManagePermission) {
      const allowedActions = ['create', 'read', 'update', 'delete'];
      return allowedActions.includes(action);
    }
    return false;
  }
  
  // 获取用户所有权限
  getUserPermissions(role: UserRole): Permission[] {
    return this.rolePermissions[role] || [];
  }
  
  // 检查是否是管理员
  isAdmin(role: UserRole): boolean {
    return role.includes('admin');
  }
  
  // 检查是否是服务商
  isServiceProvider(role: UserRole): boolean {
    return role.includes('service');
  }
  
  // 获取角色显示名称
  getRoleDisplayName(role: UserRole): string {
    const names: Record<UserRole, string> = {
      'service_admin': '服务商管理员',
      'service_engineer': '服务商工程师',
      'end_admin': '客户管理员',
      'end_engineer': '客户工程师',
    };
    
    return names[role] || role;
  }
}

export const permissionManager = new PermissionManager();