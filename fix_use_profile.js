const fs = require('fs');
let file = 'frontend/src/hooks/useProfileSettings.js';
let content = fs.readFileSync(file, 'utf8');

const updatedInitialState = `const [profileData, setProfileData] = useState({
    phone_number: user?.phone_number || '',
    email: user?.email || '',
    password: '',
    extension_name: user?.extension_name || '',
    birth_date: user?.birth_date ? user.birth_date.split('T')[0] : '',
    place_of_birth: user?.place_of_birth || '',
    sex: user?.sex || '',
    civil_status: user?.civil_status || '',
    maiden_name: user?.maiden_name || '',
    home_address: user?.home_address || '',
    last_attendance_year: user?.last_attendance_year || '',
    is_transfer_student: user?.is_transfer_student || false,
    previous_school: user?.previous_school || '',
    elem_school: user?.elem_school || '',
    elem_grad_year: user?.elem_grad_year || '',
    jhs_school: user?.jhs_school || '',
    jhs_grad_year: user?.jhs_grad_year || '',
    shs_school: user?.shs_school || '',
    shs_grad_year: user?.shs_grad_year || '',
  });`;

content = content.replace(
  /const \[profileData, setProfileData\] = useState\(\{[\s\S]*?password: '',\n  \}\);/,
  updatedInitialState
);

fs.writeFileSync(file, content);
