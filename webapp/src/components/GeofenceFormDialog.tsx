import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Box,
  Typography,
  Autocomplete,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geofencesAPI, employeesAPI, calculationProfilesAPI } from '../services/api';

// Fix Leaflet default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Employee {
  id: string;
  employeeNumber: string;
  user: { name: string };
}

interface CalculationProfile {
  id: string;
  name: string;
}

interface GeofenceFormDialogProps {
  open: boolean;
  geofence: any | null;
  onClose: (reload?: boolean) => void;
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function GeofenceFormDialog({ open, geofence, onClose }: GeofenceFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: 55.6761, // Copenhagen default
    longitude: 12.5683,
    radius: 100,
    taskType: 'DISTRIBUTION',
    employeeId: '',
    calculationProfileId: '',
    isActive: true,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<CalculationProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markerPosition, setMarkerPosition] = useState<LatLng>(new LatLng(55.6761, 12.5683));
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      loadEmployeesAndProfiles();
      if (geofence) {
        setFormData({
          name: geofence.name,
          description: geofence.description || '',
          latitude: parseFloat(geofence.latitude),
          longitude: parseFloat(geofence.longitude),
          radius: geofence.radius,
          taskType: geofence.taskType,
          employeeId: geofence.employeeId || '',
          calculationProfileId: geofence.calculationProfileId || '',
          isActive: geofence.isActive,
        });
        setMarkerPosition(new LatLng(parseFloat(geofence.latitude), parseFloat(geofence.longitude)));
      } else {
        // Reset form for new geofence
        setFormData({
          name: '',
          description: '',
          latitude: 55.6761,
          longitude: 12.5683,
          radius: 100,
          taskType: 'DISTRIBUTION',
          employeeId: '',
          calculationProfileId: '',
          isActive: true,
        });
        setMarkerPosition(new LatLng(55.6761, 12.5683));
      }
    }
  }, [open, geofence]);

  const loadEmployeesAndProfiles = async () => {
    try {
      const [empResponse, profResponse] = await Promise.all([
        employeesAPI.list(),
        calculationProfilesAPI.list(),
      ]);
      setEmployees(empResponse.data.data);
      setProfiles(profResponse.data.data);
    } catch (err) {
      console.error('Error loading employees/profiles:', err);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setMarkerPosition(new LatLng(lat, lng));
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleMarkerDragEnd = () => {
    if (markerRef.current) {
      const marker = markerRef.current;
      const position = marker.getLatLng();
      setMarkerPosition(position);
      setFormData((prev) => ({
        ...prev,
        latitude: position.lat,
        longitude: position.lng,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.employeeId && !formData.calculationProfileId) {
      setError('Vælg enten en medarbejder eller en beregningsprofil');
      return;
    }

    if (formData.employeeId && formData.calculationProfileId) {
      setError('Vælg kun én af medarbejder eller beregningsprofil');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        employeeId: formData.employeeId || null,
        calculationProfileId: formData.calculationProfileId || null,
      };

      if (geofence) {
        await geofencesAPI.update(geofence.id, payload);
      } else {
        await geofencesAPI.create(payload);
      }
      onClose(true);
    } catch (err: any) {
      console.error('Error saving geofence:', err);
      setError(err.response?.data?.message || 'Fejl ved gemning af geofence');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{geofence ? 'Rediger Geofence' : 'Tilføj Geofence'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Form fields */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Navn"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Arbejdstype</InputLabel>
                <Select
                  value={formData.taskType}
                  label="Arbejdstype"
                  onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                >
                  <MenuItem value="DISTRIBUTION">Distribution</MenuItem>
                  <MenuItem value="TERMINAL_WORK">Terminalarbejde</MenuItem>
                  <MenuItem value="DRIVING">Kørsel</MenuItem>
                  <MenuItem value="MOVING">Flytning</MenuItem>
                  <MenuItem value="LOADING">Lastning</MenuItem>
                  <MenuItem value="UNLOADING">Losning</MenuItem>
                  <MenuItem value="SMART">Smart</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Beskrivelse"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Latitude"
                value={formData.latitude}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  setFormData({ ...formData, latitude: lat });
                  setMarkerPosition(new LatLng(lat, formData.longitude));
                }}
                inputProps={{ step: 0.000001 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Longitude"
                value={formData.longitude}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  setFormData({ ...formData, longitude: lng });
                  setMarkerPosition(new LatLng(formData.latitude, lng));
                }}
                inputProps={{ step: 0.000001 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Radius (meter)"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                inputProps={{ min: 10, max: 10000 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.user.name} (${option.employeeNumber})`}
                value={employees.find((e) => e.id === formData.employeeId) || null}
                onChange={(_, value) => setFormData({ ...formData, employeeId: value?.id || '', calculationProfileId: '' })}
                renderInput={(params) => <TextField {...params} label="Medarbejder (valgfrit)" />}
                disabled={!!formData.calculationProfileId}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={profiles}
                getOptionLabel={(option) => option.name}
                value={profiles.find((p) => p.id === formData.calculationProfileId) || null}
                onChange={(_, value) => setFormData({ ...formData, calculationProfileId: value?.id || '', employeeId: '' })}
                renderInput={(params) => <TextField {...params} label="Beregningsprofil (valgfrit)" />}
                disabled={!!formData.employeeId}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Aktiv"
              />
            </Grid>

            {/* Map */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Vælg placering på kortet (klik eller træk markøren)
              </Typography>
              <Box sx={{ height: 400, border: '1px solid #ccc', borderRadius: 1 }}>
                <MapContainer
                  center={[formData.latitude, formData.longitude]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onLocationSelect={handleLocationSelect} />
                  <Marker
                    position={markerPosition}
                    draggable={true}
                    ref={markerRef}
                    eventHandlers={{
                      dragend: handleMarkerDragEnd,
                    }}
                  />
                  <Circle
                    center={markerPosition}
                    radius={formData.radius}
                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                  />
                </MapContainer>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose()} disabled={loading}>
            Annuller
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Gemmer...' : 'Gem'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
