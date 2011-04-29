<?php
require_once('init.php');
class UnhostedAccount {
	private $userAddress, $userName, $userDomain, $pwd;
	function __construct($userAddress) {
		$this->userAddress = $userAddress;
		list($this->userName, $this->userDomain) = explode("@", $userAddress);
		$this->pwd = $pwd;
	}
	private function createUserDir() {
		$userDomainDir = UnhostedSettings::davDir . $this->userDomain . '/';
		$userDir = $userDomainDir . strtolower($this->userName);
		if(is_dir($userDir)) {
			return false;
		}
		mkdir($userDomainDir);
		mkdir($userDir);
		file_put_contents($userDir."/.htpasswd", sha1($this->pwd));
		return true;
	}
	private function createDav($scope) {
		$token = base64_encode(mt_rand());
		$davDir = UnhostedSettings::davDir . "{$this->userDomain}/{$this->userName}/".$scope;
		`if [ ! -d $davDir ] ; then mkdir $davDir ; fi`;
		`echo "<LimitExcept OPTIONS HEAD GET>" > $davDir/.htaccess`;
		`echo "  AuthType Basic" >> $davDir/.htaccess`;
		`echo "  AuthName \"http://unhosted.org/spec/dav/0.1\"" >> $davDir/.htaccess`;
		`echo "  Require valid-user" >> $davDir/.htaccess`;
		`echo "  AuthUserFile $davDir/.htpasswd" >> $davDir/.htaccess`;
		`echo "</LimitExcept>" >> $davDir/.htaccess`;
		`htpasswd -bc $davDir/.htpasswd {{$this->userAddress} $token`;
		return $token;
	}
	private function createWallet($davBaseUrl, $davToken, $cryptoPwd) {
		$wallet = json_encode(array(
			"userAddress" => $userAddress,
			"davBaseUrl" => $davBaseUrl,
			"davAuth" => base64_encode($userAddress .':'. $davToken),
			"cryptoPwd" => $cryptoPwd
			));
		$davDir = UnhostedSettings::davDir . "{$this->userDomain}/{$this->userName}/".UnhostedSettings::domain;
		file_put_contents($davDir.'/wallet_'.sha1($this->pwd), $wallet);
		return $wallet;
	}
	public function getWallet($scope) {
		$davDir = UnhostedSettings::davDir . "{$this->userDomain}/{$this->userName}/".$scope;
		return file_get_content($davDir.'/wallet_'.sha1($this->pwd));
	
	}
	public function registerHosted() {
		$this->createUserDir();
		$davToken = $this->createDav(UnhostedSettings::domain);
		return $this->createWallet(UnhostedSettings::homeDavBaseUrl, $davToken, null);
	}
	public function registerWallet($davBaseUrl, $davToken) {
		$cryptoPwd = mtrand();
		return $this->createWallet($davBaseUrl, $davToken, $cryptoPwd);
	}
	public function addApp($scope) {
		$pwdFile = UnhostedSettings::davDir . "{$this->userDomain}/{$this->userName}/.htpasswd";
		if(file_exists($pwdFile) && sha1($this->pwd)==file_get_contents($pwdFile)) {
			return $this->createDav($scope);
		}
		return null;
	}
}