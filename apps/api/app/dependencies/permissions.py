from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import uuid
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.project import ProjectMember, RoleEnum

class CheckProjectRole:
    """
    Dependency to verify a user's role within a specific project.
    Extracts project_id from path parameters and validates against current_user membership.
    """
    def __init__(self, required_role: RoleEnum):
        self.required_role = required_role

    def __call__(
        self,
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> ProjectMember:
        # 1. Path Parameter Handling
        project_id_str = request.path_params.get("project_id")
        if not project_id_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project ID missing in path"
            )
        
        try:
            project_id = uuid.UUID(str(project_id_str))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Project ID format"
            )

        # 2. Membership Validation
        membership = db.query(ProjectMember).filter(
            ProjectMember.user_id == current_user.id,
            ProjectMember.project_id == project_id,
        ).first()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Not a member of this project"
            )

        # 3. Generic Role Validation
        # Roles are compared by priority: admin > member.
        # If required_role is 'admin', only 'admin' members pass.
        # If required_role is 'member', both 'admin' and 'member' members pass.
        has_insufficient_role = (
            self.required_role == RoleEnum.admin and membership.role != RoleEnum.admin
        )

        if has_insufficient_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {self.required_role.value.capitalize()} role required"
            )
        
        # 4. Return ProjectMember instance
        return membership
