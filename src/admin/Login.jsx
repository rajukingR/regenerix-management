import { StaffLogin } from '../portal/Login.jsx'

// Admins and doctors sign in here; a doctor account is sent to /doctor automatically.
export default function Login() { return <StaffLogin portal="admin" /> }
