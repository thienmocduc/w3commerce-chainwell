// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/**
 * @title TeamVesting
 * @notice Linear vesting over 3 years with 6-month cliff for WK team allocation.
 *         1,000,000,000 WK (10%) vests from cliff → end.
 */
contract TeamVesting is Ownable {
    IERC20  public immutable token;
    address public immutable beneficiary;
    uint256 public immutable startTime;
    uint256 public constant  CLIFF    = 180 days;
    uint256 public constant  DURATION = 1095 days; // 3 years
    uint256 public released;
    event Released(uint256 amount);
    constructor(address _token, address _beneficiary, address _admin)
        Ownable(_admin)
    {
        require(_token!=address(0),"TV:token=0");
        require(_beneficiary!=address(0),"TV:beneficiary=0");
        token=IERC20(_token);
        beneficiary=_beneficiary;
        startTime=block.timestamp;
    }
    function release() external {
        uint256 releasable=vestedAmount()-released;
        require(releasable>0,"TV:nothing to release");
        released+=releasable;
        require(token.transfer(beneficiary,releasable),"TV:transfer failed");
        emit Released(releasable);
    }
    function vestedAmount() public view returns(uint256){
        uint256 total=token.balanceOf(address(this))+released;
        if(block.timestamp<startTime+CLIFF) return 0;
        if(block.timestamp>=startTime+DURATION) return total;
        return total*(block.timestamp-startTime)/DURATION;
    }
    function releasable() external view returns(uint256){ return vestedAmount()-released; }
}
