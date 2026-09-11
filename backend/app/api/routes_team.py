import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, Team, TeamRole, TeamInvite
from app.api.deps import get_current_user
from app.services.email_service import send_team_invite_email

router = APIRouter(prefix="/api/team", tags=["team"])


def _require_team_admin(user: User) -> Team:
    if not user.team_id or user.team_role not in (TeamRole.OWNER, TeamRole.ADMIN):
        raise HTTPException(status_code=403, detail="You must be a team owner or admin")
    return user.team


@router.post("/create")
def create_team(name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.team_id:
        raise HTTPException(status_code=400, detail="You already belong to a team")

    team = Team(name=name, owner_id=current_user.id, plan=current_user.plan)
    db.add(team)
    db.flush()

    current_user.team_id = team.id
    current_user.team_role = TeamRole.OWNER
    db.commit()
    db.refresh(team)
    return {"id": str(team.id), "name": team.name}


@router.get("/members")
def list_members(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.team_id:
        return []
    members = db.query(User).filter(User.team_id == current_user.team_id).all()
    return [
        {"id": str(m.id), "email": m.email, "full_name": m.full_name, "role": m.team_role}
        for m in members
    ]


@router.post("/invite")
def invite_member(
    email: str,
    role: TeamRole = TeamRole.MEMBER,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _require_team_admin(current_user)

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user and existing_user.team_id == team.id:
        raise HTTPException(status_code=400, detail="This person is already on your team")

    token = secrets.token_urlsafe(32)
    invite = TeamInvite(
        team_id=team.id,
        invited_by_id=current_user.id,
        email=email,
        role=role,
        token=token,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invite)
    db.commit()

    send_team_invite_email(email, team.name, token)
    return {"detail": "Invite sent"}


@router.get("/invites")
def list_invites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = _require_team_admin(current_user)
    invites = db.query(TeamInvite).filter(TeamInvite.team_id == team.id, TeamInvite.accepted == False).all()  # noqa: E712
    return [
        {"id": str(i.id), "email": i.email, "role": i.role, "expires_at": i.expires_at.isoformat()}
        for i in invites
    ]


@router.post("/accept-invite")
def accept_invite(token: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invite = db.query(TeamInvite).filter(TeamInvite.token == token, TeamInvite.accepted == False).first()  # noqa: E712
    if not invite or invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired invite")
    if invite.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="This invite was sent to a different email address")

    current_user.team_id = invite.team_id
    current_user.team_role = invite.role
    invite.accepted = True
    db.commit()
    return {"detail": "Joined team"}


@router.delete("/members/{member_id}")
def remove_member(member_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = _require_team_admin(current_user)
    member = db.query(User).filter(User.id == member_id, User.team_id == team.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.team_role == TeamRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot remove the team owner")

    member.team_id = None
    member.team_role = None
    db.commit()
    return {"detail": "Member removed"}
