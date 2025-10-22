import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ShareIcon from '@mui/icons-material/Share';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import SendIcon from '@mui/icons-material/Send';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CodeIcon from '@mui/icons-material/Code';
import { onboardingAPI, calculationProfilesAPI, employeesAPI } from '../services/api';

const steps = [
  { id: 0, title: 'Velkommen', icon: <CheckCircleIcon /> },
  { id: 1, title: 'Lønsystem', icon: <IntegrationInstructionsIcon /> },
  { id: 2, title: 'Beregningsprofil', icon: <SettingsIcon /> },
  { id: 3, title: 'Medarbejder', icon: <PersonAddIcon /> },
  { id: 4, title: 'Medarbejder-adgang', icon: <ShareIcon /> },
  { id: 5, title: 'Tidsregistrering', icon: <AccessTimeIcon /> },
  { id: 6, title: 'Lønberegning', icon: <PaymentIcon /> },
  { id: 7, title: 'Send til lønsystem', icon: <SendIcon /> },
  { id: 8, title: 'Rapporter', icon: <AssessmentIcon /> },
  { id: 9, title: 'API Dokumentation', icon: <CodeIcon /> },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data for calculation profile
  const [profileData, setProfileData] = useState({
    name: 'Standard Beregningsprofil',
    timeRoundingMinutes: 15,
    timeRoundingDirection: 'NEAREST',
    conflictHandling: 'MANUAL_REVIEW',
    conflictThresholdPercent: 10,
  });

  // Form data for employee
  const [employeeData, setEmployeeData] = useState({
    name: '',
    email: '',
    employeeNumber: '',
    cprNumber: '',
    jobCategory: 'DRIVER',
    agreementType: 'DRIVER_AGREEMENT',
    workTimeType: 'HOURLY',
    baseSalary: '',
    employmentDate: new Date().toISOString().split('T')[0],
  });

  const [employeeInviteLink, setEmployeeInviteLink] = useState('');

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const response = await onboardingAPI.getStatus();
      const currentStep = response.data.data.team.currentOnboardingStep || 0;
      setActiveStep(currentStep);
    } catch (err) {
      console.error('Failed to load onboarding status:', err);
    }
  };

  const handleNext = async () => {
    setError('');

    // Validate and execute step-specific actions
    if (activeStep === 2) {
      // Create calculation profile
      await handleCreateProfile();
    } else if (activeStep === 3) {
      // Create employee
      await handleCreateEmployee();
    }

    try {
      await onboardingAPI.completeStep(activeStep);
      setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch (err: any) {
      console.error('Failed to complete step:', err);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = async () => {
    try {
      await onboardingAPI.skip();
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
    }
  };

  const handleFinish = async () => {
    try {
      await onboardingAPI.complete();
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
  };

  const handleCreateProfile = async () => {
    try {
      setLoading(true);
      await calculationProfilesAPI.create({
        ...profileData,
        isDefault: true,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kunne ikke oprette beregningsprofil');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!employeeData.name || !employeeData.email || !employeeData.employeeNumber) {
      setError('Udfyld venligst alle påkrævede felter');
      throw new Error('Missing required fields');
    }

    try {
      setLoading(true);
      const response = await employeesAPI.create({
        ...employeeData,
        baseSalary: parseFloat(employeeData.baseSalary),
      });

      // Generate invite link
      const baseUrl = window.location.origin;
      const inviteLink = `${baseUrl}/employee/login?email=${encodeURIComponent(employeeData.email)}`;
      setEmployeeInviteLink(inviteLink);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kunne ikke oprette medarbejder');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Welcome
        return (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
              Velkommen til Lønberegningssystemet
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, mb: 4, color: 'var(--text-secondary)' }}>
              Lad os komme i gang med at sætte systemet op, så du kan begynde at beregne løn til dine medarbejdere.
              Dette vil tage omkring 10 minutter.
            </Typography>

            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <CardContent>
                    <IntegrationInstructionsIcon sx={{ fontSize: 48, color: 'var(--accent-primary)', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Integrer lønsystem
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Forbind systemet til Danløn eller andre lønsystemer
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <CardContent>
                    <SettingsIcon sx={{ fontSize: 48, color: 'var(--accent-primary)', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Konfigurer beregninger
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sæt regler for tidsafrunding og konflikthåndtering
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <CardContent>
                    <PersonAddIcon sx={{ fontSize: 48, color: 'var(--accent-primary)', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Tilføj medarbejdere
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Opret dine første medarbejdere og giv dem adgang
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Payroll System Integration
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Tilslut lønsystem
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Vælg det lønsystem du vil integrere med. Danløn er aktivt nu - de andre kommer snart.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '2px solid var(--accent-primary)',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'var(--bg-hover)' }
                  }}
                  onClick={() => navigate('/integrations')}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Danløn
                        </Typography>
                        <Chip label="Aktivt" color="success" size="small" />
                      </Box>
                      <CheckCircleIcon sx={{ color: 'var(--accent-green)', fontSize: 48 }} />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2, color: 'var(--text-secondary)' }}>
                      Klik her for at konfigurere Danløn integration
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {['ProLøn', 'Dataløn', 'e-conomic', 'Lessor'].map((system) => (
                <Grid item xs={12} md={6} key={system}>
                  <Card
                    sx={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      opacity: 0.6
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {system}
                          </Typography>
                          <Chip label="Kommer snart" size="small" />
                        </Box>
                        <RadioButtonUncheckedIcon sx={{ color: 'var(--text-secondary)', fontSize: 48 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Du kan også springe dette step over og konfigurere integrationen senere under "Integrationer" i menuen.
            </Alert>
          </Box>
        );

      case 2: // Calculation Profile
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Opret beregningsprofil
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Beregningsprofiler bestemmer hvordan tid afrundes og konflikter håndteres.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Profil navn"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tidsafrunding (minutter)</InputLabel>
                  <Select
                    value={profileData.timeRoundingMinutes}
                    label="Tidsafrunding (minutter)"
                    onChange={(e) => setProfileData({ ...profileData, timeRoundingMinutes: e.target.value as number })}
                  >
                    <MenuItem value={0}>Ingen afrunding</MenuItem>
                    <MenuItem value={5}>5 minutter</MenuItem>
                    <MenuItem value={10}>10 minutter</MenuItem>
                    <MenuItem value={15}>15 minutter</MenuItem>
                    <MenuItem value={30}>30 minutter</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Afrundingsretning</InputLabel>
                  <Select
                    value={profileData.timeRoundingDirection}
                    label="Afrundingsretning"
                    onChange={(e) => setProfileData({ ...profileData, timeRoundingDirection: e.target.value })}
                  >
                    <MenuItem value="NEAREST">Nærmeste</MenuItem>
                    <MenuItem value="UP">Altid op</MenuItem>
                    <MenuItem value="DOWN">Altid ned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Konflikthåndtering</InputLabel>
                  <Select
                    value={profileData.conflictHandling}
                    label="Konflikthåndtering"
                    onChange={(e) => setProfileData({ ...profileData, conflictHandling: e.target.value })}
                  >
                    <MenuItem value="MANUAL_REVIEW">Manuel gennemsyn</MenuItem>
                    <MenuItem value="AUTO_ADJUST">Ret automatisk</MenuItem>
                    <MenuItem value="AUTO_WITH_NOTIFICATION">Ret automatisk med notifikation</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Konflikt tærskel (%)"
                  type="number"
                  value={profileData.conflictThresholdPercent}
                  onChange={(e) => setProfileData({ ...profileData, conflictThresholdPercent: parseFloat(e.target.value) })}
                  helperText="Afvigelse i procent før en konflikt registreres"
                />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Denne profil vil være standardprofil for alle medarbejdere. Du kan oprette flere profiler senere.
            </Alert>
          </Box>
        );

      case 3: // Add Employee
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Tilføj første medarbejder
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Opret din første medarbejder for at teste systemet.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Fulde navn"
                  value={employeeData.name}
                  onChange={(e) => setEmployeeData({ ...employeeData, name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Email"
                  type="email"
                  value={employeeData.email}
                  onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Medarbejdernummer"
                  value={employeeData.employeeNumber}
                  onChange={(e) => setEmployeeData({ ...employeeData, employeeNumber: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CPR-nummer"
                  value={employeeData.cprNumber}
                  onChange={(e) => setEmployeeData({ ...employeeData, cprNumber: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Jobkategori</InputLabel>
                  <Select
                    value={employeeData.jobCategory}
                    label="Jobkategori"
                    onChange={(e) => setEmployeeData({ ...employeeData, jobCategory: e.target.value })}
                  >
                    <MenuItem value="DRIVER">Chauffør</MenuItem>
                    <MenuItem value="WAREHOUSE">Lager</MenuItem>
                    <MenuItem value="MOVER">Flyttearbejder</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Arbejdstidstype</InputLabel>
                  <Select
                    value={employeeData.workTimeType}
                    label="Arbejdstidstype"
                    onChange={(e) => setEmployeeData({ ...employeeData, workTimeType: e.target.value })}
                  >
                    <MenuItem value="HOURLY">Timelønnet</MenuItem>
                    <MenuItem value="SALARIED">Fuldlønnet</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Grundløn (kr/time)"
                  type="number"
                  value={employeeData.baseSalary}
                  onChange={(e) => setEmployeeData({ ...employeeData, baseSalary: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ansættelsesdato"
                  type="date"
                  value={employeeData.employmentDate}
                  onChange={(e) => setEmployeeData({ ...employeeData, employmentDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 4: // Employee Access
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Del medarbejder-adgang
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Send dette link til medarbejderen, så de kan få adgang til mobilappen (webapp foreløbigt).
            </Typography>

            {employeeInviteLink ? (
              <Card sx={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Invitationslink:
                  </Typography>
                  <Box sx={{ p: 2, backgroundColor: 'var(--bg-primary)', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {employeeInviteLink}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={() => {
                      navigator.clipboard.writeText(employeeInviteLink);
                      alert('Link kopieret!');
                    }}
                  >
                    Kopier link
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="info">
                Opret en medarbejder i forrige step for at generere et invitationslink.
              </Alert>
            )}
          </Box>
        );

      case 5: // Time Registration
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Tidsregistrering
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Der er flere måder at få tidsregistreringer ind i systemet.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Manuel indtastning
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Medarbejdere kan selv indtaste deres timer via mobilappen, eller du kan indtaste dem under "Tidsregistrering" i menuen.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button onClick={() => navigate('/time-entries')}>Gå til tidsregistrering</Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Import fra system
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hvis du har et GPS-tracking system eller timesheet system, kan du importere data via vores API eller integration.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button onClick={() => navigate('/integrations')}>Se integrationer</Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Tip: Start med at teste med manuel indtastning, og konfigurer automatisk import senere når du er klar.
            </Alert>
          </Box>
        );

      case 6: // Payroll Calculation
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Lav din første lønberegning
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Når du har tidsregistreringer, kan du køre lønberegning for en periode.
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent-green)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Gå til Lønberegning"
                  secondary="Find 'Lønberegning' i menuen til venstre"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent-green)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Vælg periode"
                  secondary="Vælg start- og slutdato for lønperioden"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent-green)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Vælg medarbejdere"
                  secondary="Vælg hvilke medarbejdere der skal beregnes løn for"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent-green)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Kør beregning"
                  secondary="Systemet beregner automatisk løn baseret på overenskomst"
                />
              </ListItem>
            </List>

            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/payrolls')}
              sx={{ mt: 2 }}
            >
              Gå til lønberegning
            </Button>
          </Box>
        );

      case 7: // Send to Payroll System
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Send til lønsystem
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Efter lønberegning kan du sende resultaterne direkte til dit lønsystem.
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent-green)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Gennemse beregning"
                  secondary="Tjek at alle beløb og timer er korrekte"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent-green)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Godkend beregning"
                  secondary="Marker beregningen som godkendt"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: 'var(--accent-green)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Eksporter til lønsystem"
                  secondary="Klik 'Eksporter' og vælg dit lønsystem (fx Danløn)"
                />
              </ListItem>
            </List>

            <Alert severity="info" sx={{ mt: 3 }}>
              Hvis du ikke har konfigureret integration endnu, kan du eksportere som CSV fil.
            </Alert>
          </Box>
        );

      case 8: // Reports
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Rapporter
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Systemet kan generere forskellige rapporter til analyse og dokumentation.
            </Typography>

            <Grid container spacing={2}>
              {[
                { title: 'Lønoversigt', desc: 'Samlet oversigt over lønninger for en periode' },
                { title: 'Timeoversigt', desc: 'Detaljeret oversigt over registrerede timer' },
                { title: 'Medarbejdertimer', desc: 'Timer per medarbejder for analyse' },
                { title: 'Afvigelser', desc: 'Oversigt over konflikter og afvigelser' },
                { title: 'Lønomkostninger', desc: 'Omkostningsanalyse per afdeling/projekt' },
              ].map((report) => (
                <Grid item xs={12} md={6} key={report.title}>
                  <Card sx={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {report.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/reports')}
              sx={{ mt: 3 }}
            >
              Gå til rapporter
            </Button>
          </Box>
        );

      case 9: // API Documentation
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              API Endpoints
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Hvis du vil integrere med dit eget system, kan du bruge vores API.
            </Typography>

            <Card sx={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hvad er et API?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Et API (Application Programming Interface) er en måde for forskellige software-systemer at tale sammen.
                  Tænk på det som en "menu" af funktioner, som andre systemer kan bruge.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  For eksempel kan dit GPS-tracking system sende tidsdata direkte til vores system uden manuel indtastning.
                </Typography>
              </CardContent>
            </Card>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Populære use cases:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon sx={{ color: 'var(--accent-primary)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Automatisk import af tidsdata"
                  secondary="Fra GPS-tracking eller timesheet systemer"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon sx={{ color: 'var(--accent-primary)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Automatisk eksport til økonomiSystem"
                  secondary="Send løndata direkte til dit regnskabssystem"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon sx={{ color: 'var(--accent-primary)' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Integration med HR-system"
                  secondary="Synkroniser medarbejderdata automatisk"
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Kom i gang:
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kontakt os på support@lonberegning.dk, så hjælper vi dig med at komme i gang.
              Vi kan også lave en brugerdefineret integration for dig.
            </Typography>

            <Button variant="outlined" onClick={() => navigate('/api-docs')}>
              Se API dokumentation
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Kom i gang
            </Typography>
            <Button variant="outlined" size="small" onClick={handleSkip}>
              Spring over
            </Button>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((step, index) => (
              <Step key={step.id}>
                <StepLabel>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    {step.title}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {renderStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Tilbage
            </Button>

            <Box>
              <Button
                variant="contained"
                onClick={activeStep === steps.length - 1 ? handleFinish : handleNext}
                disabled={loading}
              >
                {activeStep === steps.length - 1 ? 'Afslut' : 'Næste'}
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Step {activeStep + 1} af {steps.length}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
