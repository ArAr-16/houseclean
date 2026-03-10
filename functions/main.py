# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import auth, db, firestore, initialize_app

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
set_global_options(max_instances=10)

initialize_app()

STATIC_ADMIN_EMAILS = {"arlryyy@gmail.com"}


def _is_admin(req: https_fn.CallableRequest) -> bool:
    if not req.auth:
        return False
    token = req.auth.token or {}
    email = str(token.get("email") or "").lower().strip()
    role = str(token.get("role") or "").lower().strip()
    is_admin_claim = token.get("admin") is True
    return is_admin_claim or role == "admin" or email in STATIC_ADMIN_EMAILS


@https_fn.on_call()
def delete_user_account(req: https_fn.CallableRequest) -> dict:
    """
    Deletes a user from Firebase Authentication and profile records.

    Client SDKs cannot delete arbitrary users from Auth, so this must run in
    a privileged environment (Admin SDK) and be admin-gated.
    """
    if not req.auth:
        raise https_fn.HttpsError("unauthenticated", "Sign in required.")

    if not _is_admin(req):
        raise https_fn.HttpsError("permission-denied", "Admin access required.")

    uid = ""
    try:
        uid = str((req.data or {}).get("uid") or "").strip()
    except Exception:
        uid = ""

    if not uid:
        raise https_fn.HttpsError("invalid-argument", "Missing uid.")

    # Never allow an admin to delete themselves via the UI by accident.
    if uid == req.auth.uid:
        raise https_fn.HttpsError("failed-precondition", "Cannot delete your own account.")

    results = {"auth": None, "firestore": None, "rtdb": None}

    # Auth
    try:
        auth.delete_user(uid)
        results["auth"] = "deleted"
    except Exception as err:
        results["auth"] = f"error:{getattr(err, 'code', '') or str(err)}"

    # Firestore (Users/{uid})
    try:
        firestore.client().collection("Users").document(uid).delete()
        results["firestore"] = "deleted"
    except Exception as err:
        results["firestore"] = f"error:{getattr(err, 'code', '') or str(err)}"

    # Realtime Database (Users/{uid})
    try:
        db.reference(f"Users/{uid}").delete()
        results["rtdb"] = "deleted"
    except Exception as err:
        results["rtdb"] = f"error:{getattr(err, 'code', '') or str(err)}"

    return {"ok": True, "uid": uid, "results": results}
#
#
# @https_fn.on_request()
# def on_request_example(req: https_fn.Request) -> https_fn.Response:
#     return https_fn.Response("Hello world!")
